console.log('Loading function build ...');
var oss = require('ali-oss').Wrapper;
var fs = require('fs');
var path = require('path');

var configFile = process.env['FC_FUNC_CODE_PATH'] + '/config.json';
var configBody = JSON.parse(fs.readFileSync(configFile).toString());
var loginUrl = configBody.loginUrl;
var ossRegion = configBody.ossRegion;
var bucketName = configBody.bucketName;
var client;
var option = {
    expires: 28800
};
var sourceDir = 'source/';
var processedDir = 'processed/';
var webDir = 'web/';
var fullsDir = 'fulls/';
var thumbsDir = 'thumbs/';
var homepageSiteDir = 'homepageSite/';
var albumSiteDir = 'albumSite/';
var homepageDir = 'site-builder/homepage';
var albumDir = 'site-builder/album';
var webPageName = 'index.html';
var triggerDir = 'processed/thumbs/';
//Get all files under a certain directory
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

function stripPrefix(object) {
    return object.name.replace(triggerDir, '');
}

function folderName(path) {
    return path.split('/')[0];
}

function isPicture(item) {
    return (item.endsWith('.jpg') || item.endsWith('.JPG') || item.endsWith('.PNG') || item.endsWith('.png') || item.endsWith('.jpeg') || item.endsWith('.JPEG'));
}
//Get albums and pics
function getAlbums(data) {
    var objects = data.sort(function (a, b) {
        var aTimeString = a.lastModified.substring(0, 19).replace('T', ' ');
        var bTimeString = b.lastModified.substring(0, 19).replace('T', ' ');
        var aDate = Date.parse(new Date(aTimeString));
        var bDate = Date.parse(new Date(bTimeString));
        return aDate - bDate;
    }).map(stripPrefix);
    objects = objects.filter(function (item) {
        return isPicture(item);
    });

    var albums = objects.map(folderName);
    // Deduplicate albums and ensure pics have to be in a certain dir
    albums = albums.filter(function (item, pos) {
        return albums.indexOf(item) === pos && !isPicture(item);
    });
    var pictures = albums.map(function (album) {
        return objects.filter(function (object) {
            return object.startsWith(album + '/');
        });
    });
    return {
        albums: albums,
        pictures: pictures
    };
}

function uploadHomepageSite(albums, pictures) {
    return new Promise(function (resolve, reject) {
        var dir = homepageDir;
        var done = function (err, files) {
            var array = new Array();
            if (err) {
                throw err;
            }
            files.map(function (f, callback) {
                var body = fs.readFileSync(f);
                if (path.basename(f) === webPageName) {
                    var picturesHTML = '';
                    for (var i = 0; i < albums.length; i++) {
                        var albumTitle = albums[i];
                        var linkUrl = client.signatureUrl(webDir + albumSiteDir + albums[i] + '/' + webPageName, option);
                        var imgUrl = client.signatureUrl(processedDir + thumbsDir + pictures[i][0], option);
                        picturesHTML += "\t\t\t\t\t\t<article class=\"thumb\">\n" + "\t\t\t\t\t\t\t<a href=\"" + linkUrl + "\" class=\"image\"><img src=\"" + imgUrl + "\" alt=\"\" /></a>\n" + "\t\t\t\t\t\t\t<h2>" + albumTitle + "</h2>\n" + "\t\t\t\t\t\t</article>\n";
                    }
                    body = body.toString().replace(/\{title\}/g, 'Photo Gallery Based On Function Compute').replace(/\{pictures\}/g, picturesHTML).replace(/\{bucketName\}/g,bucketName).replace(/\{ossRegion\}/g,ossRegion);
                    var tmpFile = '/tmp/homepageSiteIndex.html';
                    var newKey = webDir + homepageSiteDir + webPageName;
                    fs.writeFileSync(tmpFile, body);
                    // Putting object back to OSS with the new key
                    array.push(new Promise(function (resolve, reject) {
                        client.put(newKey, tmpFile).then(function (val) {
                            console.log('finish uploading homepageSite web html:', newKey);
                            resolve('upload homepageSite html site successfully');
                        }).catch(function (err) {
                            console.error('failed to upload homepageSite web html: %j', err);
                            reject('failed to upload homepageSite web html: %j', err);
                        });
                    }));
                } else if (path.basename(f) !== '.DS_Store') {
                    if (path.basename(f) === 'isExpire.js') {
                        body = body.toString().replace(/\{loginUrl\}/g, loginUrl);
                    }
                    var fName = path.relative(dir, f).split("/").join('');
                    var tmpFile = '/tmp/' + 'homeSite' + fName;
                    var newKey = webDir + homepageSiteDir + path.relative(dir, f);
                    fs.writeFileSync(tmpFile, body);
                    // Putting object back to OSS with the new key
                    array.push(new Promise(function (resolve, reject) {
                        client.put(newKey, tmpFile).then(function (val) {
                            client.putACL(newKey, 'public-read');
                            resolve('upload homepageSite file successfully');
                        }).catch(function (err) {
                            console.error('failed to upload homepageSite value: %j', err);
                            reject('failed to upload homepageSite file: %j', err);
                        });
                    }));
                }
            });
            Promise.all(array).then(function (data) {
                resolve('uploadHomepageSite executed successfully');
            }).catch(function (err) {
                console.log('failed to uploadHomepageSite: %j', err);
                reject('failed to uploadHomepageSite: %j', err);
            });
        };
        walk(dir, done);
    }).catch(function (err) {
        console.error('Error in uploadHomepageSite', err);
    });
}

function uploadAlbumSite(title, pictures) {
    return new Promise(function (resolve, reject) {
        console.log('step in uploadAlbumSite,album=', title);
        var array = new Array();
        var dir = albumDir;
        walk(dir, function (err, files) {
            if (err) throw err;
            files.map(function (f, callback) {
                var body = fs.readFileSync(f);
                if (path.basename(f) === webPageName) {
                    // Defaults
                    var renderedTitle = title,
                        comment1 = '';
                    comment2 = '';
                    // Pictures
                    var picturesHTML = '';
                    for (var i = pictures.length - 1; i >= 0; i--) {
                        var linkUrl = client.signatureUrl(processedDir + fullsDir + pictures[i], option);
                        var imgUrl = client.signatureUrl(processedDir + thumbsDir + pictures[i], option);
                        var bigImgUrl = client.signatureUrl(sourceDir + pictures[i], option);
                        var homePageUrl = client.signatureUrl(webDir + homepageSiteDir + webPageName, option);
                        picturesHTML += "\t\t\t\t\t\t<article>\n" + "\t\t\t\t\t\t\t<a class=\"thumbnail\" href=\"" + linkUrl + "\" data-position=\"center\"><img class=\"lazy\" src=\"assets/css/images/placeholder.png\" data-original=\"" + imgUrl + "\" width=\"360\" height=\"225\"/></a>\n" + "<p><a href=\"" + bigImgUrl + "\" download>High Resolution Download</a></p>\n" + "\t\t\t\t\t\t</article>";
                    }
                    var backToHomePageHTML = "<a href=\"" + homePageUrl + "\">Back to albums.</a>";
                    body = body.toString().replace(/\{title\}/g, renderedTitle).replace(/\{comment1\}/g, comment1).replace(/\{comment2\}/g, comment2).replace(/\{backToHomePage\}/g, backToHomePageHTML).replace(/\{pictures\}/g, picturesHTML).replace(/\{bucketName\}/g,bucketName).replace(/\{ossRegion\}/g,ossRegion);
                    var tmpFile = '/tmp/' + title + 'index.html';
                    var newKey = webDir + albumSiteDir + title + '/' + webPageName;
                    fs.writeFileSync(tmpFile, body);
                    // Putting object back to OSS with the new key
                    array.push(new Promise(function (resolve, reject) {
                        client.put(newKey, tmpFile).then(function (val) {
                            console.log('finished uploading albumSite web html: ' + title, newKey);
                            resolve('finished uploading albumSite web html: ' + title, newKey);
                        }).catch(function (err) {
                            console.error('Failed to upload albumSite web html: %j' + title, err);
                            reject('Failed to upload albumSite web html: %j' + title, err);
                        });
                    }));
                } else if (path.basename(f) !== '.DS_Store') {
                    if (path.basename(f) === 'isExpire.js') {
                        body = body.toString().replace(/\{loginUrl\}/g, loginUrl);
                    }
                    var fName = path.relative(dir, f).split('/').join('');
                    var tmpFile = '/tmp/' + fName;
                    // console.log('tmpFileName: ', tmpFile);
                    var newKey = webDir + albumSiteDir + title + "/" + path.relative(dir, f);
                    fs.writeFileSync(tmpFile, body);
                    // Putting object back to OSS with the new key
                    array.push(new Promise(function (resolve, reject) {
                        client.put(newKey, tmpFile).then(function (val) {
                            client.putACL(newKey, 'public-read');
                            resolve('upload albumSite file successfully');
                        }).catch(function (err) {
                            console.error('Failed to upload albumSite value: ' + fName, err);
                            reject('Failed to upload albumSite value: ' + fName, err);
                        });
                    }));
                }
            });
            Promise.all(array).then(function (data) {
                console.log('uploadAlbumSite executed successfully', title);
                resolve('uploadAlbumSite executed successfully');
            }).catch(function (err) {
                console.log('failed to uploadAlbumSite: %j', err);
                reject('failed to uploadAlbumSite: %j', err);
            });
        });
    }).catch(function (err) {
        console.error('Error in uploadAlbumSite', err);
    });
}

function getObjFromOss(startMarker) {
    var i = 1;
    var res = new Array();

    function getFromOssPromise(nextMarker, resolve, reject) {
        console.log('i', ++i);
        client.list({
            prefix: 'processed/thumbs',
            marker: nextMarker
        }).then(function (response) {
            if (response.isTruncated) {
                console.log('response isTruncated', response.isTruncated);
                res = res.concat(response.objects);
                getFromOssPromise(response.nextMarker, resolve, reject)
            } else {
                res = res.concat(response.objects)
                console.log('oss list finished');
                resolve(res);
            }
        }).catch(function (err) {
            console.log('err', err);
            reject('oss list err', err);
        })
    }
    return new Promise(function (resolve, reject) {
        getFromOssPromise(startMarker, resolve, reject);
    })
}

exports.build = function (eventBuf, ctx, callback) {
    console.log('Received event:', eventBuf.toString());
    var event = JSON.parse(eventBuf);
    if (event.events) {
        var ossEvent = event.events[0];
    }else {
        console.log('event.payload',event.payload);
        console.log('event.payload[0]',JSON.parse(event.payload))
        var ossEvent = JSON.parse(event.payload).events[0];
    }
    // Required by OSS sdk: OSS region is prefixed with "oss-", e.g. "oss-cn-shanghai"
    
    // Create oss client.
    client = new oss({
        region: ossRegion,
        accessKeyId: ctx.credentials.accessKeyId,
        accessKeySecret: ctx.credentials.accessKeySecret,
        stsToken: ctx.credentials.securityToken,
        bucket: bucketName
    });
    // Bucket name is from OSS event
    client.useBucket(bucketName);
    console.log('ossRegion', ossRegion);
    console.log('bucketName', bucketName);

    // List all bucket objects
    console.log('start to get oss list');
    getObjFromOss('').then(function (res) {
        console.log('start to getAlbums...');
        console.log('res', res);
        var albumsAndPictures = getAlbums(res);
        console.log('albumsAndPictures', albumsAndPictures);
        var array = new Array();
        array.push(uploadHomepageSite(albumsAndPictures.albums, albumsAndPictures.pictures));
        for (var i = albumsAndPictures.albums.length - 1; i >= 0; i--) {
            array.push(uploadAlbumSite(albumsAndPictures.albums[i], albumsAndPictures.pictures[i]));
        }
        Promise.all(array).then(function () {
            console.log('end');
            callback(null, 'suc');
        });
    }).catch(function (err) {
        callback(err);
    });
}