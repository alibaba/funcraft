import rpy2.robjects as robjects
from rpy2.robjects import pandas2ri 

def handler(event, context):  
    pandas2ri.activate()
    return str(robjects.r('paste0("1 + 1 = ", 1 + 1)'))