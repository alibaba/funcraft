'use strict';

const TableStore = require('tablestore');
const Long = TableStore.Long;

async function getClient(context) {
    return new TableStore.Client({
        accessKeyId: context.credentials.accessKeyId,
        secretAccessKey: context.credentials.accessKeySecret,
        stsToken: context.credentials.securityToken,
        endpoint: process.env['Endpoint'],
        instancename: process.env['InstanceName']
    });
}

async function getCount(client) {
    var params = {
        tableName: process.env['TableName'],
        primaryKey: [{ 'count_name': 'views' }],
        maxVersions: 1
    };

    const tableName = process.env['TableName'];
    const response = await client.getRow(params); 
    const row = response.row;

    if (row && row.primaryKey) {
        return row.attributes[0].columnValue.toNumber();
    }
    return null;
}

exports.handler = function(event, context, callback) {

    (async () => {
        let views = null;

        const client = await getClient(context);
        let success = false;

        do {
            views = await getCount(client);

            if (views) { 
                try {
                    await client.updateRow({
                        tableName: process.env['TableName'],
                        condition: new TableStore.Condition(TableStore.RowExistenceExpectation.IGNORE, new TableStore.SingleColumnCondition('count', Long.fromNumber(views), TableStore.ComparatorType.EQUAL)),
                        primaryKey: [{ 'count_name': 'views' }],
                        updateOfAttributeColumns: [
                            { 'PUT': [{'count': Long.fromNumber(views + 1)}]}
                        ],
                        returnContent: { returnType: TableStore.ReturnType.Primarykey }
                    });
                    success = true;
                } catch (ex) {
                    if (ex.code !== 403) {
                        callback(ex, null);
                    }
                }
            } else {
                try {
                    views = 1;
                    const res = await client.updateRow({
                        tableName: process.env['TableName'],
                        condition: new TableStore.Condition(TableStore.RowExistenceExpectation.EXPECT_NOT_EXIST, null),
                        primaryKey: [{ 'count_name': 'views' }],
                        updateOfAttributeColumns: [
                            { 'PUT': [{'count': Long.fromNumber(views)}]}
                        ]
                    });
                    success = true;
                } catch (ex) {
                    console.log(ex);
                }
            }
        } while(!success);

        var response = {
            isBase64Encoded: false,
            statusCode: 200,
            body: `You are the ${views}th visitor!`
        };

        callback(null, response);
    })();
};
