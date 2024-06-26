/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var dongtinghuplain = ee.FeatureCollection("users/jingyayang2/1025_single_double_classification_final_version/DTH_wgs84"),
    geometry = /* color: #d63000 */ee.Geometry.Point([112.56623891050293, 29.57531238840209]),
    example_region = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[112.26039056581783, 29.400202053529714],
          [112.26039056581783, 29.01662637162786],
          [112.69023065370845, 29.01662637162786],
          [112.69023065370845, 29.400202053529714]]], null, false),
    geometry2 = /* color: #d63000 */ee.Geometry.Point([112.58844630394326, 29.03242012110321]),
    popm20000_randomly_selected = ee.FeatureCollection("users/jingyayang2/pppm20000");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// This code is doing to generate VH and VH/VV time series,including:
//(1)Removing higher incidence angles in overlapping areas.;
//(2)20-day median composition;
//(3)Refined Lee Filter;
//(refer to https://code.earthengine.google.com/2ef38463ebaf5ae133a478f173fd0ab5 Author: Guido Lemoine)
//(4) S-G filter;
//(refer to https://code.earthengine.google.com/e9f4f2bb84f0bdd26ecfbea47a71885f Author: Guido Lemoine)

// Study area 
var roi=dongtinghuplain;
//Map.addLayer(roi)


var     srtm = ee.Image("USGS/SRTMGL1_003");
var sentinle1col = ee.ImageCollection('COPERNICUS/S1_GRD')
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
            .filter(ee.Filter.eq('instrumentMode', 'IW'))
            .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
            .filterBounds(roi)
            .filterDate('2019-01-01','2019-12-31')
            //.select(['angle','VH'])// 
print(sentinle1col,'sentinle1col');

var image2=sentinle1col.reduce(ee.Reducer.count())
var image_count=image2.select('VH_count')
function maskS1(image) {
  var count=image_count;
  var mask1=count.lt(59);//31
  var mask2=count.gte(59).and(image.select("angle").lt(40))
  var mask =mask1.add(mask2)
  return image.updateMask(mask)//.unmask(0);//.divide(10000);
}

var sentinle1col_remove_high_incidenceangle=sentinle1col.map(maskS1)
print(sentinle1col_remove_high_incidenceangle,'sentinle1col_remove_high_incidenceangle')
//Example figures illustrating the removal of higher incidence angles in overlapping areas.

////before removing higher incidence angles in overlapping areas
// var rice3Chart = ui.Chart.image.series(ee.ImageCollection(sentinle1col).select(['VH','angle']),ee.Feature(geometry),ee.Reducer.mean(),10,'system:time_start')
//     .setChartType('ScatterChart')
//     .setOptions({
//       title: 'Sentinel 1 time series',
//       lineWidth: 2,
//       pointSize: 4,
//       vAxis: {minValue:-1, maxValue: 1},
// });
// print(rice3Chart)

// // after removing higher incidence angles in overlapping areas
// var rice3Chart = ui.Chart.image.series(ee.ImageCollection(sentinle1col_remove_high_incidenceangle).select(['VH','angle']),ee.Feature(geometry),ee.Reducer.mean(),10,'system:time_start')
//     .setChartType('ScatterChart')
//     .setOptions({
//       title: 'Sentinel 1 time series',
//       lineWidth: 2,
//       pointSize: 4,
//       vAxis: {minValue:-1, maxValue: 1},
// });
// print(rice3Chart)

var Date_Start = ee.Date('2019-01-01');
var Date_End = ee.Date('2019-12-31');
var Date_window = ee.Number(20);// time window for image composition
var n_days = Date_End.difference(Date_Start,'day').round();
print(n_days)
var dates = ee.List.sequence(0,n_days,20);
print(dates)
function make_datelist(n){
  return Date_Start.advance(n,'day');	
}
dates = dates.map(make_datelist);
print(dates)

function range(d1){
  var d2=ee.Date(d1).advance(20,'day')
  var dg=ee.DateRange(d1, d2)
  return dg
}
var daterg = dates.map(range)
print(daterg ,'daterg ')


var i = 0;
var s1imgcol = ee.List([]);

while (i<19){
  var dt = daterg.get(i)
  var img = sentinle1col_remove_high_incidenceangle.select(['VH','VV']).filterDate(dt).median();
  s1imgcol = s1imgcol.add(img);
  i++;
}
print(s1imgcol,'20-day median composition');
//fill missing pixles if exited
function addmean(image){
  var weights3 = ee.List.repeat(ee.List.repeat(1,21),21);
  var kernel3 = ee.Kernel.fixed(21,21, weights3, 10, 10, false);
  var image1=image//.unmask(0)
  var mean3 = image1.reduceNeighborhood(ee.Reducer.mean(), kernel3,'kernel',false);
  var add=image.unmask(mean3)
  return add
}
var s1imgcol_VH=ee.ImageCollection(s1imgcol).select('VH').map(addmean)
var s1imgcol_VHVV=ee.ImageCollection(s1imgcol).select('VV').map(addmean)

//Refined Lee filter
function toNatural(img) {
return ee.Image(10.0).pow(img.select(0).divide(10.0));
}

function toDB(img) {
return ee.Image(img).log10().multiply(10.0);
}


function RefinedLee(img) {
  // img must be in natural units, i.e. not in dB!
  // Set up 3x3 kernels
  var myimg2= img;
  // convert to natural.. do not apply function on dB!
  var myimg = toNatural(myimg2);
   
  var weights3 = ee.List.repeat(ee.List.repeat(1,3),3);
  var kernel3 = ee.Kernel.fixed(3,3, weights3, 1, 1, false);
   
  var mean3 = myimg.reduceNeighborhood(ee.Reducer.mean(), kernel3);
  var variance3 = myimg.reduceNeighborhood(ee.Reducer.variance(), kernel3);
   
  // Use a sample of the 3x3 windows inside a 7x7 windows to determine gradients and directions
  var sample_weights = ee.List([[0,0,0,0,0,0,0], [0,1,0,1,0,1,0],[0,0,0,0,0,0,0], [0,1,0,1,0,1,0], [0,0,0,0,0,0,0], [0,1,0,1,0,1,0],[0,0,0,0,0,0,0]]);
   
  var sample_kernel = ee.Kernel.fixed(7,7, sample_weights, 3,3, false);
   
  // Calculate mean and variance for the sampled windows and store as 9 bands
  var sample_mean = mean3.neighborhoodToBands(sample_kernel);
  var sample_var = variance3.neighborhoodToBands(sample_kernel);
   
  // Determine the 4 gradients for the sampled windows
  var gradients = sample_mean.select(1).subtract(sample_mean.select(7)).abs();
  gradients = gradients.addBands(sample_mean.select(6).subtract(sample_mean.select(2)).abs());
  gradients = gradients.addBands(sample_mean.select(3).subtract(sample_mean.select(5)).abs());
  gradients = gradients.addBands(sample_mean.select(0).subtract(sample_mean.select(8)).abs());
   
  // And find the maximum gradient amongst gradient bands
  var max_gradient = gradients.reduce(ee.Reducer.max());
   
  // Create a mask for band pixels that are the maximum gradient
  var gradmask = gradients.eq(max_gradient);
   
  // duplicate gradmask bands: each gradient represents 2 directions
  gradmask = gradmask.addBands(gradmask);
   
  // Determine the 8 directions
  var directions = sample_mean.select(1).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(7))).multiply(1);
  directions = directions.addBands(sample_mean.select(6).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(2))).multiply(2));
  directions = directions.addBands(sample_mean.select(3).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(5))).multiply(3));
  directions = directions.addBands(sample_mean.select(0).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(8))).multiply(4));
  // The next 4 are the not() of the previous 4
  directions = directions.addBands(directions.select(0).not().multiply(5));
  directions = directions.addBands(directions.select(1).not().multiply(6));
  directions = directions.addBands(directions.select(2).not().multiply(7));
  directions = directions.addBands(directions.select(3).not().multiply(8));
   
  // Mask all values that are not 1-8
  directions = directions.updateMask(gradmask);
   
  // "collapse" the stack into a singe band image (due to masking, each pixel has just one value (1-8) in it's directional band, and is otherwise masked)
  directions = directions.reduce(ee.Reducer.sum());
   
  var sample_stats = sample_var.divide(sample_mean.multiply(sample_mean));
   
  // Calculate localNoiseVariance
  var sigmaV = sample_stats.toArray().arraySort().arraySlice(0,0,5).arrayReduce(ee.Reducer.mean(), [0]);
   
  // Set up the 7*7 kernels for directional statistics
  var rect_weights = ee.List.repeat(ee.List.repeat(0,7),3).cat(ee.List.repeat(ee.List.repeat(1,7),4));
   
  var diag_weights = ee.List([[1,0,0,0,0,0,0], [1,1,0,0,0,0,0], [1,1,1,0,0,0,0],
  [1,1,1,1,0,0,0], [1,1,1,1,1,0,0], [1,1,1,1,1,1,0], [1,1,1,1,1,1,1]]);
   
  var rect_kernel = ee.Kernel.fixed(7,7, rect_weights, 3, 3, false);
  var diag_kernel = ee.Kernel.fixed(7,7, diag_weights, 3, 3, false);
   
  // Create stacks for mean and variance using the original kernels. Mask with relevant direction.
  var dir_mean = myimg.reduceNeighborhood(ee.Reducer.mean(), rect_kernel).updateMask(directions.eq(1));
  var dir_var = myimg.reduceNeighborhood(ee.Reducer.variance(), rect_kernel).updateMask(directions.eq(1));
   
  dir_mean = dir_mean.addBands(myimg.reduceNeighborhood(ee.Reducer.mean(), diag_kernel).updateMask(directions.eq(2)));
  dir_var = dir_var.addBands(myimg.reduceNeighborhood(ee.Reducer.variance(), diag_kernel).updateMask(directions.eq(2)));
   
  // and add the bands for rotated kernels
  for (var i=1; i<4; i++) {
  dir_mean = dir_mean.addBands(myimg.reduceNeighborhood(ee.Reducer.mean(), rect_kernel.rotate(i)).updateMask(directions.eq(2*i+1)));
  dir_var = dir_var.addBands(myimg.reduceNeighborhood(ee.Reducer.variance(), rect_kernel.rotate(i)).updateMask(directions.eq(2*i+1)));
  dir_mean = dir_mean.addBands(myimg.reduceNeighborhood(ee.Reducer.mean(), diag_kernel.rotate(i)).updateMask(directions.eq(2*i+2)));
  dir_var = dir_var.addBands(myimg.reduceNeighborhood(ee.Reducer.variance(), diag_kernel.rotate(i)).updateMask(directions.eq(2*i+2)));
  }
   
  // "collapse" the stack into a single band image (due to masking, each pixel has just one value in it's directional band, and is otherwise masked)
  dir_mean = dir_mean.reduce(ee.Reducer.sum());
  dir_var = dir_var.reduce(ee.Reducer.sum());
   
  // A finally generate the filtered value
  var varX = dir_var.subtract(dir_mean.multiply(dir_mean).multiply(sigmaV)).divide(sigmaV.add(1.0));
   
  var b = varX.divide(dir_var);
   
  var result = dir_mean.add(b.multiply(myimg.subtract(dir_mean)));
  //return(result);
  return(img.select([]).addBands(ee.Image(result.arrayGet(0))));
  //return(img.select([]).addBands(ee.Image(toDB(result.arrayGet(0)))));//NOT TO DB HERE,BUT AFTER CALCULATING RVI
}

var sentinel1_refinedlee_VH=s1imgcol_VH.select('VH').map(RefinedLee);
var sentinel1_refinedlee_VV=s1imgcol_VHVV.select('VV').map(RefinedLee);

print(sentinel1_refinedlee_VV,'sentinel1_refinedlee_VV');
print(sentinel1_refinedlee_VH,'sentinel1_refinedlee_VH');


var ratiolist=ee.List([]);
for(var i=0; i<18;i++){
  var image_VHtemp=sentinel1_refinedlee_VH.toList(18).get(i);
  var image_VVtemp=sentinel1_refinedlee_VV.toList(18).get(i);
  var ratio=toDB(ee.Image(image_VHtemp).divide(ee.Image(image_VVtemp)));
  var ratiolist = ratiolist.add(ratio);
}
print(ratiolist,'ratiolist')
// generate timeseries

var listsum1=ee.List([]);
for (var i=0;i<18;i=i+1)
{  
  var listsum1=listsum1.add(ee.Image(ratiolist.get(i)).set('ss',i).unmask(0));
 // Map.addLayer(ee.Image(ratiolist.get(i)),{},'img'+i)
}
print('listsum1',listsum1);



var listsum1_VH=ee.List([]);
for (var i=0;i<18;i=i+1)
{  
  var listsum1_VH=listsum1_VH.add(toDB(ee.Image(sentinel1_refinedlee_VH.toList(18).get(i))).set('ss',i).unmask(0));

}
print('listsum1_VH',listsum1_VH);

//S-G filter

//fill the T0 value in step T18 for time window for S-G was set as 5 here
var listsum1_clip=listsum1.add(ee.Image(listsum1.get(0)).unmask(0).set('ss',18))
var listsum1_VH_clip=listsum1_VH.add(ee.Image(listsum1_VH.get(0)).unmask(0).set('ss',18))

print(listsum1_clip,'listsum1_clip')
var final_rvi_seg=ee.List([])
var final_vh_seg=ee.List([])

for(var i=0;i<19;i++){
  //var i=0;
  var temp2=listsum1_clip.get(i);
  var temp3=listsum1_VH_clip.get(i);
  // users can upload Seg_result(Segmentation results in tiff format) for the entire region to generate object-level raster
  var RVI_afterseg = ee.Image(temp2)//.addBands(seg_result).reduceConnectedComponents(ee.Reducer.mean(), 'clusters', 256).unmask(0).set('ss',i);
  var VH_afterseg = ee.Image(temp3)//.addBands(seg_result).reduceConnectedComponents(ee.Reducer.mean(), 'clusters', 256).unmask(0).set('ss',i);
  //print(RVI_aftersg_seg,'RVI_aftersg_seg')
  //print(VH_aftersg_seg,'VH_aftersg_seg')
  var final_rvi_seg=final_rvi_seg.add(RVI_afterseg);
  var final_vh_seg=final_vh_seg.add(VH_afterseg);

}
print(final_vh_seg,'final_vh_seg')

//S-G filter
function SG_filter(listsum){
  
var modis_res = ee.ImageCollection(listsum).map(function(img) {
  var dstamp = ee.Number(img.get('ss'))
  var ddiff = dstamp
  img = img.select(['sum']).set('date', dstamp)
  return img.addBands(ee.Image(1).toFloat().rename('constant')).
    addBands(ee.Image(ddiff).toFloat().rename('t')).
    addBands(ee.Image(ddiff).pow(ee.Image(2)).toFloat().rename('t2')).
    addBands(ee.Image(ddiff).pow(ee.Image(3)).toFloat().rename('t3'))
})
////print(modis_res,'modis_res')

// Step 2: Set up Savitzky-Golay smoothing
var window_size = 5
var half_window = (window_size - 1)/2

// Define the axes of variation in the collection array.
var imageAxis = 0;
var bandAxis = 1;

// // Set polynomial order
// var order = 3
// var coeffFlattener = [['constant', 'x', 'x2', 'x3']]
// var indepSelectors = ['constant', 't', 't2', 't3']

//Change to order = 2 as follows:
var order = 2
var coeffFlattener = [['constant', 'x', 'x2']]
var indepSelectors = ['constant', 't', 't2']

// Convert the collection to an array.
var array = modis_res.toArray()//.updateMask(countmask1.eq(18));
//print(array,'array')
// Solve 
function getLocalFit(i) {
  // Get a slice corresponding to the window_size of the SG smoother
  var subarray = array.arraySlice(imageAxis, ee.Number(i).int(), ee.Number(i).add(window_size).int())
  var predictors = subarray.arraySlice(bandAxis, 1,1 + order + 1)
  var response = subarray.arraySlice(bandAxis, 0, 1); // NDVI
  var coeff = predictors.matrixSolve(response)

  coeff = coeff.arrayProject([0]).arrayFlatten(coeffFlattener)
  return coeff  
}

// For the remainder, use modis_res as a list of images
modis_res = modis_res.toList(modis_res.size())
var runLength = ee.List.sequence(0, modis_res.size().subtract(window_size))
////print(runLength,'runLength')
// Run the SG solver over the series, and return the smoothed image version
var sg_series = runLength.map(function(i) {
  var ref = ee.Image(modis_res.get(ee.Number(i).add(half_window)))
  return getLocalFit(i).multiply(ref.select(indepSelectors)).reduce(ee.Reducer.sum()).copyProperties(ref)
})

return sg_series
}

var RVI_seg_sg=SG_filter(final_rvi_seg)
var VH_seg_sg=SG_filter(final_vh_seg)

print(RVI_seg_sg,'RVI_seg_sg')
print(VH_seg_sg,'VH_seg_sg')

var final_rvi_aftersg_seg=ee.List([])
var final_vh_aftersg_seg=ee.List([])
//index=1 refer to "2019-03-02" to "2019-03-22"
for(var i=1;i<15;i++){
 var temp4=RVI_seg_sg.get(i);
 var temp5=VH_seg_sg.get(i);
  var final_rvi_aftersg_seg=final_rvi_aftersg_seg.add(temp4);
  var final_vh_aftersg_seg=final_vh_aftersg_seg.add(temp5);
  
}
print(final_rvi_aftersg_seg,'final_rvi_aftersg_seg')
print(final_vh_aftersg_seg,'final_vh_aftersg_seg')

var rice3Chart = ui.Chart.image.series(ee.ImageCollection(final_rvi_aftersg_seg),ee.Feature(geometry2),ee.Reducer.mean(),10,'ss')
    .setChartType('ScatterChart')
    .setOptions({
      title: 'Sentinel 1 time series',
      lineWidth: 2,
      pointSize: 4,
      vAxis: {minValue:-1, maxValue: 1},
});
print(rice3Chart)

//export object-based VH and VH/VV data of 20000 randomly selected potential rice objects
var empty_RVI = ee.Image().select()
var multiband_RVI = ee.ImageCollection(final_rvi_aftersg_seg).iterate(function(image, result) {
   return ee.Image(result).addBands(image)
}, empty_RVI)
var Stuck_RVI = ee.Image(multiband_RVI)
print('Stuck_RVI',Stuck_RVI);//Stuck contains all features

var empty_VH = ee.Image().select()
var multiband_VH = ee.ImageCollection(final_vh_aftersg_seg).iterate(function(image, result) {
   return ee.Image(result).addBands(image)
}, empty_VH)
var Stuck_VH = ee.Image(multiband_VH)
print('Stuck_VH',Stuck_VH);//Stuck contains all features

var Stuck_VH_RVI=Stuck_VH.addBands(Stuck_RVI.select(['sum','sum_1','sum_2','sum_3','sum_4','sum_5','sum_6','sum_7','sum_8','sum_9','sum_10','sum_11','sum_12','sum_13'], 
          ['rvi','rvi_1','rvi_2','rvi_3','rvi_4','rvi_5','rvi_6','rvi_7','rvi_8','rvi_9','rvi_10','rvi_11','rvi_12','rvi_13']))
print('Stuck_VH_RVI',Stuck_VH_RVI);

var rvi_vh_rice=Stuck_VH_RVI.reduceRegions({
  collection:ee.FeatureCollection(popm20000_randomly_selected), 
  scale:10, 
  reducer:ee.Reducer.mean()
// tileScale:16
})

Export.table.toDrive({
  collection:rvi_vh_rice, 
fileNamePrefix: '20000_randomly_selected_potential_rice', 
fileFormat:'CSV'});