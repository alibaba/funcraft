import pymssql

def handler(event, context):
    conn = pymssql.connect(
        host=r'docker.for.mac.host.internal',
        user=r'SA',
        password=r'Codelife.me',
        database='TestDB'
    )
    
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM inventory WHERE quantity > 152')
    
    result = ''

    for row in cursor:
        result += 'row = %r\n' % (row,)

    conn.close()
    return result