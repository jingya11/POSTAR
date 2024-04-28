# -*- coding: utf-8 -*-
"""
Created on Wed Apr 17 16:41:04 2024

@author: yangj
"""


import gdal
import os
from pandas import read_csv
from pandas import DataFrame
from matplotlib import pyplot
import numpy as np
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt

dataset_random_export = np.array(read_csv(r'...\demo data\03-POPM20000_VH_VHVV_Kmeans.csv'));

dataset_VH=dataset_random_export[:,16:30];
dataset_VHVV=dataset_random_export[:,1:15];


def calculate_pve(ts_data,len_ts,groupnum_range):
    #ts_data=dataset_VH
    #len_ts=14
    #groupnum_range=np.arange(1,131)
    
    GM=np.mean(ts_data,axis=0);
    ssb_result=[];
    sst_result=[];
    bt_result=[];
    sse_result=[];
    for groupnum in groupnum_range:
        kmeans_train=[]
        y_pred=[]
        Center=[]
        
        #groupnum=2
        L=GM*np.ones((groupnum,14));
        L2=GM*np.ones((len(ts_data),14));
        kmeans_train= KMeans(n_clusters=groupnum);
        kmeans_train.fit(ts_data); 
        y_pred = kmeans_train.predict(ts_data)
        Center=kmeans_train.cluster_centers_

        num=[];
        for i2 in range(groupnum):
            #i2=0
            temp=[];
            select_temp=np.where(y_pred==i2);
            gruopnum_tep=y_pred[select_temp];
            temp=len(gruopnum_tep);
            num.append(temp);

        num=np.array(num);
    
    
        ssb_result_temp=np.sum(num*np.sum((Center-L)**2,1));
        ssb_result.append(ssb_result_temp);
        sst_result_temp=np.sum(np.sum((ts_data-L2)**2,1));
        sst_result.append(sst_result_temp);
        print(groupnum)
        bt_result=np.array(ssb_result)/np.array(sst_result);

    return bt_result


PVE_VH_1_130=calculate_pve(dataset_VH,14,np.arange(1,131))
print(PVE_VH_1_130)
PVE_VHVV_1_130=calculate_pve(dataset_VHVV,14,np.arange(1,131))
print(PVE_VHVV_1_130)



X_train=dataset_VH;
kmeans = KMeans(n_clusters=42); 
kmeans.fit(X_train);  
predict_y = kmeans.predict(X_train)


for cluster_temp in range(0,42):
    #cluster_temp=40
    group_temp=np.where(predict_y==cluster_temp)[0]
    #rice_temp=np.zeros(shape=(len(group_temp[0]),14))
    rice=dataset_VH[group_temp]
    ax1 = plt.subplot(1,1,1)
    ax1.plot(rice.T)
    plt.ylim(-37,-9)#(-37,-9)#(-16,-1)
    plt.xlim(-2,14)
    ticks=[0, 7, 13]
    labels=[80, 220, 340]
    #plt.xticks(ticks, labels)
    ticks_y=[-30, -23, -16]
    labels_y=[-30, -23, -16]#[-30, -23, -16]#[-16, -8, -1]
    #plt.yticks(ticks_y, labels_y)
    plt.rcParams['xtick.direction'] = 'in';
    plt.rcParams['ytick.direction'] = 'in';
    plt.subplots_adjust(wspace =0.05, hspace =0.05)
    
    plt.setp(ax1.get_xticklabels(), visible=False)
    plt.setp(ax1.get_yticklabels(), visible=False)
    plt.xticks(ticks, labels)
    plt.yticks(ticks_y, labels_y)
    name1=str(cluster_temp)+'.png'
    save_name=os.path.join(r'.....\kmeans_result_VH',name1)
    plt.savefig(save_name)  

    plt.cla()
