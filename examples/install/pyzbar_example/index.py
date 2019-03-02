import os
for a in os.environ:
    print('Var: ', a, 'Value: ', os.getenv(a))

from pyzbar.pyzbar import decode
from pyzbar.pyzbar import ZBarSymbol
from PIL import Image

def handler(event, context):
    img = Image.open('./qrcode.png')
    return decode(img, symbols=[ZBarSymbol.QRCODE])[0].data