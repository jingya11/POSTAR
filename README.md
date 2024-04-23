# An automated sample generation method by integrating phenology domain optical-SAR features in rice cropping pattern mapping
This is an official implementation of POSTAR method in our paper: An automated sample generation method by integrating phenology domain optical-SAR features in rice cropping pattern mapping

![image](https://github.com/jingya11/POSTAR/blob/main/IMAGE/IMAGE-01.jpg)
Fig.1 Framework of the POSTAR method for generating SC-Rice and DC-Rice samples

The workflow of POSTAR  mainly included three procedures: <br>

GEE_code/01-PPPM corrosponding to the GEE code for Step 1 of POSTAR;<br>
GEE_code/02-Export SAR data corrosponding to the GEE code for exporting VH and VH/VV time series of potential rice samples;<br>
"pppm20000_VH_VHVV_Kmeans.csv" refers to the Kmeans results of 20000 randomly selected potential rice samples;<br>
Two-step refinement strategy/TwoStep_Refinement_Strategy corrosponding to the python code for Step3 of POSTAR, ;<br>
