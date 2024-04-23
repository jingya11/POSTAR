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

### POSTAR
**POPM.js:** GEE code for generating a potential rice map **(Data-2)**, which serves as a sample pool for randomly selecting potential rice objects **(Data-3)**;<br>
**Calculate PVE and Kmeans clustering.py:** Code for calculating PVE values and clustering VH and VH/VV data **(Data-3)**. Then, SC- and DC-Rice candidate clusters **(Data-4)** were identified based on unique SAR-based phenological features (Fig. 3-4);<br>
![image](https://github.com/jingya11/POSTAR/blob/main/IMAGE/IMAGE-03.jpg)
<p align="center">
Fig.3 The  distinct semantic cues specific to SC-Rice (“Vt-Ph/m”) and DC-Rice (“Vt-Ph/m-Vt-Ph/m”) characterized by S1 data
</p>

![image](https://github.com/jingya11/POSTAR/blob/main/IMAGE/IMAGE-04.jpg)
<p align="center">
Fig.4 The pre-labeling process involves identifying candidate clusters as SC-Rice and DC-Rice based on their distinct SAR phenological features
</p>

**TwostepRefinementStrategy.py:** Code for applying the two-step refinement strategy to filter high-confidence SC- and DC-Rice samples (Data-5);<br>

### Demo data
**snic_output_region.tif:** Result of SNIC exported from SNIC segmentation.js;<br>
**POPM_demo_region_output1.tif:** Object-based potential rice map exported from POPM.js;<br>
**POPM20000_VH_VHVV_Kmeans.csv:** <br>
CSV_ Columns---VHVV_* & VH_* : S-1 VH/VV and VH values for 20000 randomly selected potential rice objects. These objects were randomly selected from POPM result, and their VH and VH/VV data were exported using S1 data generation.js;<br>
CSV_ Columns---*_kmeans results: VH cluster IDs and VH/VV cluster IDs for 20000 potential rice objects, which were generated using Calculate PVE and Kmeans clustering.py;<br>




