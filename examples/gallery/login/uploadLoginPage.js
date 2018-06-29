var oss = require('ali-oss').Wrapper;
var fs = require('fs');
var path = require('path');
var configFile = process.env['FC_FUNC_CODE_PATH'] + '/config.json';
var configBody = JSON.parse(fs.readFileSync(configFile).toString());
var ossRegion = configBody.ossRegion;
var bucketName = configBody.bucketName;
var logAuthApiUrl = configBody.logAuthApiUrl;
var loginFormDir = 'login/loginForm';
var loginDir = 'login/'
var walk = function (dir, done) {
    try {
        var results = [];
        var list = fs.readdirSync(dir);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
                        results = results.concat(res);
                        if (!--pending) {
                            done(null, results);
                        }
                    });
                } else {
                    results.push(file);
                    if (!--pending) {
                        done(null, results);
                    }
                }
            });
        });
    } catch (err) {
        console.log(err, err.stack);
    }
};

function uploadLoginForm() {
    return new Promise(function (resolve, reject) {
        var dir = loginFormDir;
        var done = function (err, files) {
            var array = new Array();
            if (err) {
                throw err;
            }
            files.map(function (f, callback) {
                var body = fs.readFileSync(f);
                if (path.basename(f) !== '.DS_Store') {
                    if (path.basename(f) === 'index.js') {
                        body = body.toString().replace(/\{logAuthApiUrl\}/g, logAuthApiUrl);
                    }
                    var fName = path.relative(dir, f).split("/").join('');
                    var tmpFile = '/tmp/' + fName;
                    var newKey = loginDir + path.relative(dir, f);
                    fs.writeFileSync(tmpFile, body);
                    // Putting object back to OSS with the new key
                    array.push(new Promise(function (resolve, reject) {
                        client.put(newKey, tmpFile).then(function (val) {
                            client.putACL(newKey, 'public-read');
                            resolve('upload loginForm page successfully');
                        }).catch(function (err) {
                            console.error('failed to upload loginForm page: %j', err);
                            reject('failed to upload loginForm page: %j', err);
                        });
                    }));
                }
            });
            Promise.all(array).then(function (data) {
                console.log('upload loginForm page executed successfully');
                resolve('upload loginForm page executed successfully');
            }).catch(function (err) {
                console.log('failed to upload loginForm page: %j', err);
                reject('failed to upload loginForm page: %j', err);
            });
        };
        walk(dir, done);
    }).catch(function (err) {
        console.error('Error in upload loginForm page', err);
    });
}

module.exports.uploadLoginPage = function (eventBuf, ctx, callback) {
    // Create oss client.
    client = new oss({
        region: ossRegion,
        accessKeyId: ctx.credentials.accessKeyId,
        accessKeySecret: ctx.credentials.accessKeySecret,
        stsToken: ctx.credentials.securityToken,
        bucket: bucketName
    });
    uploadLoginForm().then(function () {
        callback(null, 'uploadLoginPage successfully');
    })
}