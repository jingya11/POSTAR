# -*- coding: utf-8 -*-
"""
Created on Wed Jan 17 11:39:46 2024

@author: yangj
"""

import pandas as pd
import numpy as np
import os
import gdal
import rasterio
from matplotlib import pyplot as plt

#Sample Data for VH and VH/VV time series and K-means clustering result of 20000 randomly selected potential rice objects
RVI_VH_merge=pd.read_csv(r'.\pppm20000_VH_VHVV_Kmeans.csv',dtype='str')

VH_frame1=np.array(RVI_VH_merge)[0:20000,16:30].astype('float64')
RVI_frame1=np.array(RVI_VH_merge)[0:20000,1:15].astype('float64')

kmeans_vh=np.array(RVI_VH_merge)[:,30].astype('float64')
kmeans_rvi=np.array(RVI_VH_merge)[:,15].astype('float64')

# Cluter num for DC-Rice candiate clusters
cluster_rvi_dataset=[2,16,18,21,28,29,31,36,39,43,44,45,47,49,54,55,62,63,67]
cluster_vh_dataset=[1,16,28,34,38,42]

VH_purified=np.zeros([1,14])
VH_purified=[VH_purified,RVI_frame1[1]]

VHVV_purified=np.zeros([1,14])
VHVV_purified=[VHVV_purified,RVI_frame1[1]]

for cluster_rvi in cluster_rvi_dataset:
    for cluster_vh in cluster_vh_dataset:


##Step-1
        num_rvi_vh=np.where((np.array(kmeans_rvi)[:]==cluster_rvi)& (np.array(kmeans_vh)[:]==cluster_vh));
        
        if len(num_rvi_vh[0])!=0:                      

            double_rvi_23=RVI_frame1[num_rvi_vh]
            #plt.plot(double_rvi_23.T)
            double_vh_23=VH_frame1[num_rvi_vh]
            #plt.plot(double_vh_23.T)


##Step-2

#RVI
            points_ts=double_rvi_23

            ts_max=np.max(points_ts,axis=0)
            ts_min=np.min(points_ts,axis=0)
            differ=ts_max-ts_min
            ts_2p5=ts_min+0.1 * differ
            ts_97p5=ts_max-0.1 * differ

#VH    
            points_ts_VH=double_vh_23

            ts_max_VH=np.max(points_ts_VH,axis=0)
            ts_min_VH=np.min(points_ts_VH,axis=0)
            differ_VH=ts_max_VH-ts_min_VH
            ts_2p5_VH=ts_min_VH+0.1 * differ_VH
            ts_97p5_VH=ts_max_VH-0.1 * differ_VH
            
            bool_result_VH_RVI=(points_ts_VH > ts_2p5_VH.T) & (points_ts_VH < ts_97p5_VH.T) & (points_ts > ts_2p5.T) & (points_ts < ts_97p5.T)
            mean_bool_VH=np.mean(bool_result_VH_RVI,axis=1)
    
    
            points_ts2_RVI=points_ts[mean_bool_VH==1]
            points_ts2_VH=points_ts_VH[mean_bool_VH==1]
        
            if len(points_ts2_RVI)!=0:
                points_ts2=points_ts2_VH
                point_ts2_VHVV=points_ts2_RVI

                VH_purified.append(points_ts2)
                VHVV_purified.append(point_ts2_VHVV)
                
                            
            else:
                    print(cluster_rvi)
                    print(cluster_vh)


VH_purified=VH_purified[2:len(VH_purified)]
VHVV_purified=VHVV_purified[2:len(VHVV_purified)]
lenlist = []
for i in VH_purified:
    lenlist.append(len(i))
sum_list = np.sum(lenlist)

#purified_final=np.zeros([1,14])
purified_final=VH_purified[0].astype('float64')
for i in range(1,len(VH_purified)):
    temp=np.array(VH_purified[i].astype('float64')).reshape(len(VH_purified[i]),14)
    test=np.vstack((purified_final,temp))
    purified_final=test
 
purified_final_VHVV=VHVV_purified[0].astype('float64')
for j in range(1,len(VHVV_purified)):
    temp2=np.array(VHVV_purified[j].astype('float64')).reshape(len(VHVV_purified[j]),14)
    test2=np.vstack((purified_final_VHVV,temp2))
    purified_final_VHVV=test2  

purified_final_ALL=np.hstack((purified_final,purified_final_VHVV))

pd.DataFrame(purified_final_ALL.astype('float64')).to_csv(r'.\VH_VHVV_purified_doublerice.csv')