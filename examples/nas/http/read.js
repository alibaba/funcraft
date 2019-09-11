
const fs = require('fs');
const path = require('path');

module.exports.handler = function (request, response, context) {
  
    const root = process.env['ROOT_DIR'];

    var file = 'test_http.txt';

    console.log("# read dir is : " + fs.readdirSync(root));
    console.log("path.join(root, file): " + path.join(root, file));

    var contents = fs.readFileSync(path.join(root, file), 'utf8');
    
    const res = {
        file,
        contents,
        message: "read success"
    };

    response.setStatusCode(200)
    response.setHeader('content-type', 'application/json');
    response.send(JSON.stringify(res));
}