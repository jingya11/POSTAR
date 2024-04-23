# An automated sample generation method by integrating phenology domain optical-SAR features in rice cropping pattern mapping
This is an official implementation of POSTAR method in our paper: An automated sample generation method by integrating phenology domain optical-SAR features in rice cropping pattern mapping

![image](https://github.com/jingya11/POSTAR/blob/main/IMAGE/IMAGE-01.jpg)
<p align="center">
Fig.1 Framework of the POSTAR method for generating SC-Rice and DC-Rice samples
</p>

![image](https://github.com/jingya11/POSTAR/blob/main/IMAGE/IMAGE-02.jpg)
<p align="center">
Fig.2 Overview of Code and Demo Data
</p>

## Detailed Descriptions for Code and Demo Data are Provided as Follows:
### Data pre-processing
**SNIC segmentation.js:** GEE code for performing image segmentation to generate objects; The segmented images **(Data-1)** were then used in **S1 data generation.js** and **POPM.js** to calculate the average values of each feature. ultimately generating object-based features (i.e., NDVI, EVI, LSWI, VH, and VH/VV) employed in the POSTAR; <br>

**S1 data generation.js:** GEE code for generating object-based S-1 VH and VH/VV data;<br>

