# -*- coding:utf-8 -*-   
import os
import sys
import cv2  
import numpy as np
import tensorflow as tf  

saver = None

modelDir = os.environ['ModelDir']

def reversePic(src):
    for i in range(src.shape[0]):
        for j in range(src.shape[1]):
            src[i, j] = 255 - src[i, j]
    return src 

def handler(event, context):
    sess = tf.Session()  

    saver = tf.train.import_meta_graph(modelDir + '/model.meta')
 
    saver.restore(sess, modelDir + '/model')
    graph = tf.get_default_graph()
    
    input_x = sess.graph.get_tensor_by_name("Mul:0")
    y_conv2 = sess.graph.get_tensor_by_name("final_result:0")
    
    path="pic/e2.jpg"  
    im = cv2.imread(path, cv2.IMREAD_GRAYSCALE)

    im = reversePic(im)

    im = cv2.resize(im, (28, 28), interpolation=cv2.INTER_CUBIC)  

    x_img = np.reshape(im , [-1 , 784])  

    output = sess.run(y_conv2 , feed_dict={input_x:x_img})  
    res = np.argmax(output)
    sess.close()

    return 'the predict is %d' % res

