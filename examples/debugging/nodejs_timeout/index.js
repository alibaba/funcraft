
var request = require('request');

exports.handler = function(event, context, callback) {
    const options = {
        url: 'https://saweather.market.alicloudapi.com/spot-to-weather?area=%E6%B3%B0%E5%B1%B1&need3HourForcast=0&needAlarm=0&needHourData=0&needIndex=0&needMoreDay=0',

        headers: {
            Authorization: 'APPCODE 5d9129e294fc4f518793ae9f9a15dbff'
        }
    }

    request(options, function (error, response, body) {
        if (error || response.statusCode != 200) {
            console.log("error " + error);
            callback(error, null) ;
        } 

        callback(null, JSON.parse(body).showapi_res_body.f1.day_weather);
    });
}; 