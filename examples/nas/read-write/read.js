
const fs = require('fs');
const path = require('path');

module.exports.handler = function(event, context, callback) { 
  
    const root = process.env['ROOT_DIR'];

    var file = 'test.txt';

    console.log("# read dir is : " + fs.readdirSync(root));
    console.log("path.join(root, file): " + path.join(root, file));

    var contents = fs.readFileSync(path.join(root, file), 'utf8');

    callback(null, contents); 
}