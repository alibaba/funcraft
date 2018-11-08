# -*- coding: utf-8 -*-

import ptvsd

# Enable ptvsd on 0.0.0.0 address and on port 5890 that we'll connect later with our IDE
print("11111")
ptvsd.enable_attach(address=('0.0.0.0', 3000), redirect_output=True)
print("22222")
ptvsd.wait_for_attach()
print("33333")


def handler(event, context):
    return "hello world"
