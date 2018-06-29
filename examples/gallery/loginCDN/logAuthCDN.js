var TableStore = require('tablestore');
var oss = require('ali-oss').Wrapper;
var md5 = require('js-md5');
var fs = require('fs');
var configFile = process.env['FC_FUNC_CODE_PATH'] + '/config.json';
var configBody = JSON.parse(fs.readFileSync(configFile).toString());
var domainName = configBody.domainName;
var instanceName = configBody.instanceName;
var tableName = configBody.tableName;
var otsRegion = configBody.otsRegion;
var bucketName = configBody.bucketName;
var ossRegion = configBody.ossRegion;
var key = configBody.key;
var resUrl;
var ossClient;
var option = {
  expires: 18000
};
var fileName = '/webCDN/homepageSite/index.html';

function authenticate(otspasswd, passwd) {
  console.log('authenticate', otspasswd === passwd)
  return otspasswd === passwd;
}

function getUrl() {
  // cdn方式获取url
  // 设置失效时间为5小时
  var timeStamp = parseInt(new Date().getTime() / 1000) + 18000;
  var sstring = fileName + '-' + timeStamp + '-' + '0-0-' + key;
  console.log('sstring', sstring);
  var authValue = md5(sstring);
  var url = domainName + fileName + '?auth_key=' + timeStamp + '-0-0-' + authValue;
  console.log('url', url);
  return url;
}

module.exports.handler = function (eventBuf, context, callback) {
  console.log('loading logAuth');
  //Input username and password
  var event = JSON.parse(eventBuf);
  console.log('event', event);
  var body = event.body;
  var jsonObj = JSON.parse(body);
  var username = jsonObj.name;
  var passwd = jsonObj.password;
  console.log('name', username);

  ossClient = new oss({
    region: ossRegion,
    accessKeyId: context.credentials.accessKeyId,
    accessKeySecret: context.credentials.accessKeySecret,
    stsToken: context.credentials.securityToken,
    bucket: bucketName
  });

  //get password from OTS according to username
  var client = new TableStore.Client({
    accessKeyId: context.credentials.accessKeyId,
    secretAccessKey: context.credentials.accessKeySecret,
    stsToken: context.credentials.securityToken,
    endpoint: 'http://' + instanceName + '.' + otsRegion + '.ots.aliyuncs.com',
    instancename: instanceName,
  });

  var getReq = {
    tableName: tableName,
    primaryKey: [{
      'username': username
    }],
  };
  client.getRow(getReq, function (err, data) {
    if (err) {
      console.log('There is an error when getRow from OTS', err);
      return callback(err);
    }
    console.log('getRow success: %j', data);
    var row = data.row;
    console.log('row', row);
    if (row.attributes) {
      console.log('otspasswd exists');
      otspasswd = row.attributes[0].columnValue;
      console.log('passwd', otspasswd);
    } else {
      console.log('otspasswd non-exists');
      otspasswd = null;
    }
    var response = {};
    if (authenticate(otspasswd, passwd)) {
      resUrl = getUrl();
      response = {
        isBase64Encoded: false,
        statusCode: '200',
        headers: {
          'x-custom-header': 'header value'
        },
        body: {
          'url': resUrl
        }
      };
      console.log('resUrl', resUrl);

    } else {
      response = {
        isBase64Encoded: false,
        statusCode: '200',
        headers: {
          'x-custom-header': 'header value'
        },
        body: {}
      };
    }
    console.log('response', response);
    callback(null, response);
  });
};