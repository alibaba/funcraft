'use strict';
console.log('Loading function ...');
var oss = require('ali-oss').Wrapper;
var fs = require('fs');
var gm = require('gm').subClass({
    imageMagick: true
});

/*
sourceDir: Source pictures directory
fullsDir: Processed pictures which stores big pictures(1200*750)
thumbsDir: Processed pictures which stores small pictures(360*225)
*/
var sourceDir = 'source/';
var fullsDir = 'processed/fulls/';
var thumbsDir = 'processed/thumbs/';

module.exports.resize = function (eventBuf, ctx, callback) {
    console.log('Received event:', eventBuf.toString());
    var event = JSON.parse(eventBuf);
    var ossEvent = event.events[0];
    var eventName = ossEvent.eventName;
    console.log('oss eventname', eventName);
    var ossRegion = 'oss-' + ossEvent.region;

    // Create oss client.
    var client = new oss({
        region: ossRegion,
        accessKeyId: ctx.credentials.accessKeyId,
        accessKeySecret: ctx.credentials.accessKeySecret,
        stsToken: ctx.credentials.securityToken
    });
    client.useBucket(ossEvent.oss.bucket.name);

    var item = ossEvent.oss.object.key;
    var suffix = item.split('.')[1];
    var newKeyFulls = ossEvent.oss.object.key.replace(sourceDir, fullsDir);
    var newKeyThumbs = ossEvent.oss.object.key.replace(sourceDir, thumbsDir);
    var tmpFullsFile = '/tmp/fulls' + new Date().getTime() + '.' + suffix;
    var tmpThumbFile = '/tmp/thumbs' + new Date().getTime() + '.' + suffix;
    var image = '/tmp/origin' + new Date().getTime() + '.' + suffix;
    // Determine whether the trigger event is created or removed
    var ossCreatePattern = new RegExp('Created');
    var ossDeletePattern = new RegExp('Removed');

    console.log('suffix: ', suffix);
    if (!((suffix === 'jpg') || (suffix === 'JPG') || (suffix === 'PNG') || (suffix === 'png') || (suffix === 'jpeg') || (suffix === 'JPEG'))) {
        callback(null, 'the event is not an image event');
        return;
    }

    if (ossCreatePattern.test(eventName)) {
        console.log('oss put');
        console.log('Getting object: ', item);
        client.get(item).then(function (val) {
            // Read object from buffer
            fs.writeFileSync(image, val.content);
            console.log('image', image);
            // Resize the image and save it to a tmp file
            new Promise(function (resolve, reject) {
                gm(image).resize(null, 750).write(tmpFullsFile, function (err) {
                    if (err) {
                        console.error('Failed to write image into fulls locally', err);
                        reject('Failed to write image into fulls locally');
                    }
                    // Putting object back to OSS with the new key
                    console.log('start putting object into fulls: ', newKeyFulls);
                    client.put(newKeyFulls, tmpFullsFile).then(function (val) {
                        console.log('finished putting object into fulls:', val);
                        resolve('Success putting object into fulls', val);
                    }).catch(function (err) {
                        console.error('Failed to put object into fulls: %j', err);
                        reject('Failed to put object into fulls: %j', err);
                    });
                })
            }).then(function () {
                return new Promise(function (resolve, reject) {
                    gm(image).resize(360, 225, '!').write(tmpThumbFile, function (err) {
                        if (err) {
                            console.error('Failed to write image into thumbs locally', err);
                            reject('Failed to write image into thumbs locally');
                        }
                        // Putting object back to OSS with the new key
                        console.log('Putting object into thumbs: ', newKeyThumbs);
                        client.put(newKeyThumbs, tmpThumbFile).then(function (val) {
                            console.log('finished putting object into thumbs:', val);
                            resolve('Success putting object into thumbs:', val);

                        }).catch(function (err) {
                            console.error('Failed to put object into thumbs: %j', err);
                            reject('Failed to put object into thumbs: %j', err);
                        });
                    })
                })
            }).then(function () {
                console.log('Put pics finished');
                callback(null, 'Put pics finished');
            })
        }).catch(function (err) {
            console.error('Failed to get object: %j', err);
            callback(err);
        });

    } else if (ossDeletePattern.test(eventName)) {
        console.log('oss delete');
        new Promise(function (resolve, reject) {
            client.delete(newKeyFulls).then(function (res) {
                console.log(newKeyFulls + 'has been deleted', res);
                resolve(newKeyFulls + 'has been deleted');
            }).catch(function (err) {
                console.error(err);
                reject('Failed to delete object in fulls: %j', err);
            });
        }).then(function () {
            return new Promise(function (resolve, reject) {
                client.delete(newKeyThumbs).then(function (res) {
                    console.log(newKeyThumbs + 'has been deleted', res);
                    resolve(newKeyThumbs + 'has been deleted');
                }).catch(function (err) {
                    console.error(err);
                    reject('Failed to delete object in thumbs: %j', err);
                });
            });
        }).then(function () {
            console.log('delete pics finished');
            callback(null, 'delete pics finished');
        })
    }
};