/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var s2_cloud_probility = ee.ImageCollection("COPERNICUS/S2_CLOUD_PROBABILITY"),
    s2SR = ee.ImageCollection("COPERNICUS/S2_SR"),
    demo_region = ee.FeatureCollection("users/jingyayang2/demo_region");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
//This code serves as a demonstrator for applying SNIC in the demo region

var Date_Start = ee.Date('2019-01-01');
var Date_End = ee.Date('2019-12-30');

var cloud_probability_roi= s2_cloud_probility.filterDate(Date_Start, Date_End).filterBounds(demo_region);
var s2SR_roi = s2SR.filterDate(Date_Start, Date_End).filterBounds(demo_region);
// Join two collections on their 'system:index' property.
function indexJoin(collectionA, collectionB, propertyName) {
  var joined = ee.ImageCollection(ee.Join.saveFirst(propertyName).apply({
    primary: collectionA,
    secondary: collectionB,
    condition: ee.Filter.equals({
      leftField: 'system:index',
      rightField: 'system:index'})
  }));
  // Merge the bands of the joined image.
  return joined.map(function(image) {
    return image.addBands(ee.Image(image.get(propertyName)));
  });
}

// Aggressively mask clouds and shadows.
function maskImage(image) {

  var s2c = image.select('probability');
  var isCloud = s2c.gt(65);
  return image.updateMask(isCloud.not());
}

// Join the cloud probability dataset to surface reflectance.
var s2SR_withCloudProbability = indexJoin(s2SR_roi, cloud_probability_roi, 'cloud_probability');

// Map the cloud masking function over the joined collection.
var s2SR_removecloud_V0= ee.ImageCollection(s2SR_withCloudProbability.map(maskImage));
var s2SR_removecloud=s2SR_removecloud_V0.map(function(img){
  var img1=img.select(['B1','B2','B3','B4','B5','B6','B7','B8','B8A','B9','B11','B12']).divide(10000);
  var out = img1.copyProperties(img).copyProperties(img,['system:time_start']);
  return out;
})
//print(s2SR_removecloud,'s2SR_removecloud')


var n_months = Date_End.difference(Date_Start,'day').round();
//print(n_months)
var dates = ee.List.sequence(0,n_months,5);
//print(dates)
function make_datelist(n){
  return Date_Start.advance(n,'day');	
}
dates = dates.map(make_datelist);
//print(dates)

function range(d1){
  var d2=ee.Date(d1).advance(5,'day')
  var dg=ee.DateRange(d1, d2)
  return dg
}
var daterg = dates.map(range)
print(daterg ,'daterg ')

var i = 0;
var s1imgcol = ee.List([]);

for(var i=0;i<73;i++){//73
  var dt = daterg.get(i);
  //print(dt)
  var img = s2SR_removecloud.select(['B2', 'B3', 'B4','B8']).filterDate(dt).median();
  var img1 =img.set('doy',i);
  s1imgcol = s1imgcol.add(img1);
  //Map.addLayer(img.clip(dongtinghuplain), {bands:["B4", "B3", "B2"], min:0, max:0.3,scale:10}, "1layer-"+i);
}
//print(s1imgcol,'s1imgcol');
var allyear_mean=ee.ImageCollection(s1imgcol).median();
//print(allyear_mean,'allyear_mean')
var img_input=ee.Image(s1imgcol.get(41)).unmask(allyear_mean)
//print(img_input,'img_input')


var snic = ee.Algorithms.Image.Segmentation.SNIC({
  image: img_input,
  size: 10,
  compactness: 0,
  connectivity: 8,

});

var clusters = snic.select('clusters')
Map.addLayer(img_input.clip(demo_region), {bands:["B4", "B3", "B2"], min:0, max:0.3,scale:10},"S2_image")
Map.addLayer(clusters.clip(demo_region),{},'SNIC_result')
Export.image.toAsset({
    image: clusters.clip(demo_region),
    scale:10,
    assetId:'users/XXXXXX/demo_snic_output_region',
    crs: 'EPSG:4326',
    region: demo_region,
  maxPixels:1e13
  });


