/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var s2SR = ee.ImageCollection("COPERNICUS/S2_SR"),
    s2_cloud_probility = ee.ImageCollection("COPERNICUS/S2_CLOUD_PROBABILITY"),
    MYD11A2 = ee.ImageCollection("MODIS/006/MYD11A2"),
    Cropland_Mask = ee.Image("users/jingyayang2/cropland_union_test_region"),
    demo_region = ee.FeatureCollection("users/jingyayang2/demo_region"),
    demo_snic_output_region = ee.Image("users/jingyayang2/demo_snic_output_region");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
//This code serves as a demonstrator for applying 
//the phenology- and object-based paddy rice mapping (referred to as POPM) method on GEE

//references:Dong, J., Xiao, X., Menarguez, M. A., Zhang, G., Qin, Y., Thau, D., Biradar, C., Moore, B., 3rd, 2016. 
//           Mapping paddy rice planting area in northeastern Asia with Landsat 8 images, phenology-based algorithm and Google Earth Engine. 
//           Remote Sens. Environ., 185, 142-154.

// users can upload Seg_result(Segmentation results in tiff format：“demo_snic_output_region.tif”)
//to extent PPPM to POPM(the phenology- and object-based paddy rice mapping)


var Date_Start = ee.Date('2019-01-01');
var Date_End = ee.Date('2019-12-30');

// Convert Binary to decimal data
var RADIX = 2;  // Radix for binary (base 2) data.
var extractQABits = function (qaBand, bitStart, bitEnd) {
     var numBits = bitEnd - bitStart + 1;
     var qaBits = qaBand.rightShift(bitStart).mod(Math.pow(RADIX, numBits));
      return qaBits;
     };

// S2 Cloud probability product.
var cloud_probability_roi= s2_cloud_probility.filterDate(Date_Start, Date_End).filterBounds(demo_region);
// S2 L2A for surface reflectance bands.
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

  return joined.map(function(image) {
    return image.addBands(ee.Image(image.get(propertyName)));
  });
}

// Pixels with cloud cover probabilities greater than 65% were removed.
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
  var img2=img1.addBands(img.select('probability'));
  var out = img2.copyProperties(img).copyProperties(img,['system:time_start']);
  return out;
})
//print(s2SR_removecloud,'s2SR_removecloud')

//calculate Vegetation Index
//NDVI
function NDVI(img){
  var ndvi = img.normalizedDifference(["B8","B4"])
  var ndvi_1=ndvi.addBands(demo_snic_output_region).reduceConnectedComponents(ee.Reducer.mean(), 'b1', 256).updateMask((img.select('probability').gt(65)).not());
  // users can upload Seg_result(Segmentation results in tiff format) to extent PPPM to POPM,
  return ndvi_1.clamp(-1,1);
}
//EVI
function EVI(img){
  var nir= img.select("B8");
  var red= img.select("B4");
  var blue= img.select("B2");
  var evi = img.expression(
    "2.5*(nir-red)/(nir+6*red-7.5*blue+1)",
    {
      "nir":nir,
      "red":red,
      "blue":blue
    }
    );
  var evi_1=evi.addBands(demo_snic_output_region).reduceConnectedComponents(ee.Reducer.mean(), 'b1', 256).updateMask((img.select('probability').gt(65)).not());
    return evi_1.clamp(-1,1);
}
//LSWI
function LSWI(img){
  var lswi = img.normalizedDifference(["B8","B11"]);
  var lswi_1=lswi.addBands(demo_snic_output_region).reduceConnectedComponents(ee.Reducer.mean(), 'b1', 256).updateMask((img.select('probability').gt(65)).not());
  return lswi_1;
}

//calculate 'EVI-LSWI'
function EVI_LSWI(img){
  var evi= img.select("EVI");
  var lswi=img.select('LSWI');
  var evi_lswi = img.expression(
    "EVI - LSWI",
    {
      "EVI":evi,
      "LSWI":lswi
    }
    );
    return evi_lswi;
}
//calculate 'NDVI-LSWI'
function NDVI_LSWI(img){
  var ndvi= img.select("NDVI");
  var lswi=img.select('LSWI');
  var ndvi_lswi = img.expression(
    "NDVI - LSWI",
    {
      "NDVI":ndvi,
      "LSWI":lswi
    }
    );
    return ndvi_lswi;
}

var add_VI_senSR=s2SR_removecloud.map(function(image){
      var ndvi = NDVI(image).rename('NDVI');
      var lswi = LSWI(image).rename('LSWI');
      var evi = EVI(image).rename('EVI');
    return image.addBands([ndvi,evi,lswi]);
 });


var add_VI_senSR_1 = add_VI_senSR.map(function(image){
    var evi_lswi = EVI_LSWI(image).rename('EVI_LSWI');
    var ndvi_lswi = NDVI_LSWI(image).rename('NDVI_LSWI');
    
  return image.addBands([evi_lswi,ndvi_lswi]);
  
}).select('EVI_LSWI' ,'NDVI_LSWI');
print(add_VI_senSR_1.first(),'add_VI_senSR_1')

//POPM
//calculating SOT & EOT of rice transplanting phrase
var MODIS_NLST =MYD11A2;

var temCol = MODIS_NLST.filterDate('2019-01-01', '2019-12-31').filterBounds(demo_region)
                  .select('LST_Night_1km','QC_Night')
                  .map(function(image) {
                    var time_end = ee.Date(image.get("system:time_start"))
                                    .format("D");
                    var doy = ee.Image.constant(ee.Number.parse(time_end))
                                .rename("doy")
                                .toUint16();
                    var NLST = image.select('LST_Night_1km').multiply(0.02)
                                  .subtract(273.15)
                                  .rename("NLST");           
                    return NLST.addBands(doy).addBands(image.select('QC_Night'));
                  }).sort("system:time_start");
                  
print(temCol,'temCol')
// 1) quality control --------------------------------------------
var temCOL_QC=temCol.map(
  function (image){

    var image_qa = image.select('QC_Night');


     var bitStartCloudConfidence = 2;
     var bitEndCloudConfidence = 3;
     var qaBitsCloudConfidence = extractQABits(image_qa, bitStartCloudConfidence, bitEndCloudConfidence);

     var testCloudConfidence = qaBitsCloudConfidence.eq(0);

     var maskComposite = testCloudConfidence

  return image.updateMask(maskComposite)
  
});
print(temCOL_QC,'temCOL_QC')

// 2) Linear interpolation --------------------------------------------
//(refer to You N, Dong J, Huang J, Du G, Zhang G, He Y, Yang T, Di Y,Xiao X. 
//The 10-m crop type maps in Northeast China during 2017-2019. Sci. Data, 2021, 8: 41)
var size = temCOL_QC.size()
var LIC = temCOL_QC.toList(size)
print(LIC,'LIC')
var interpolated = ee.ImageCollection(ee.List.sequence(1,44,1).map(function(i2){
  var i = ee.Number(i2)
  var before = ee.ImageCollection.fromImages(LIC.slice(0,i)).mosaic()
  var after = ee.ImageCollection.fromImages(LIC.slice(i.add(1),46).reverse()).mosaic()
  var boforeY = before.select('NLST')
  var beforedoy = before.select('doy')
  var afterY = after.select('NLST')
  var afterdoy = after.select('doy')
  var targetImg = ee.Image(LIC.get(i))
  var currentdoy =targetImg.select('doy').float();
  var Y = afterY.subtract(boforeY).divide(afterdoy.subtract(beforedoy))
      .multiply(currentdoy.subtract(beforedoy)).add(boforeY)
  var filledImage = targetImg.select('NLST').unmask(Y)

  return filledImage.addBands(targetImg.select('doy')).clip(demo_region)
    .set('system:time_start',targetImg.get('system:index'),'doy',targetImg.get('doy')) // can not simply copy all properties of composites
})) ;

print(interpolated,'interpolated')


var sdayImg = interpolated.map(function(image) {
                    image = image.updateMask(image.select("NLST").gte(15));
                    return image;
                  })
                  .select(["doy", "NLST"])
                  .reduce(ee.Reducer.min(2).setOutputs(["doy", "NLST"]))
                  .select("doy")
                  .clip(demo_region);
                  
var edayImg =sdayImg.select(["doy"]).add(80).toUint16();

/// calculate the frequency of flooding signals during the rice transplanting phase
var l8Img_flood1 = add_VI_senSR_1.map(function(image) {
                      var evi=image.select("EVI_LSWI");
                      var ndvi=image.select("NDVI_LSWI");
                      var image_temp=ee.Image(0).copyProperties(evi).copyProperties(evi,['system:time_start']);
                
                      var flood =ee.Image(image_temp).where(evi.lt(0).or(ndvi.lt(0)),1);
                              

                      return flood;
              })
            .map(function(image){
              var doy = ee.Number.parse(ee.Date(image.get("system:time_start")).format("D"));
                image = image.updateMask(sdayImg.lte(doy).and(edayImg.gte(doy)));
              return image;
              }).sum()
print(l8Img_flood1,'l8Img_flood1')

var l8Img_flood = add_VI_senSR_1
                          .map(function(image){
              var doy = ee.Number.parse(ee.Date(image.get("system:time_start")).format("D"));
                image = image.updateMask(sdayImg.lte(doy).and(edayImg.gte(doy)));
              return image;
              }).reduce(ee.Reducer.count());
print(l8Img_flood,'l8Img_flood')
              
var image_result=l8Img_flood1.select("constant").divide(l8Img_flood.select("EVI_LSWI_count"));
print(image_result)

var image_result_2=image_result.where(image_result.gte(0.1),1)
                            .where(image_result.lt(0.1),0);
print(image_result_2)

var image_result_cropland=image_result_2.updateMask(Cropland_Mask.eq(1));
Map.addLayer(image_result_cropland.clip(demo_region))

Export.image.toDrive({
  image:image_result_cropland.clip(demo_region),
  fileNamePrefix:'POPM_demo_region_output',
  region:demo_region, 
  scale:10, 
  crs:'EPSG:4326',
  fileFormat:'GeoTIFF',
  maxPixels:1e13
  })
