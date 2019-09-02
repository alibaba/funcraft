const { exec } = require('child_process');


module.exports.handler = function (event, context, callback) {
  const cmd = 'gs -sDEVICE=jpeg -dTextAlphaBits=4 -r144 -o /tmp/test.jpg test.pdf';
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.log("stdout =================== START");
      console.log(stdout);
      console.log("stdout =================== END");
      console.log("stderr =================== START");
      console.log(stderr);
      console.log("stderr =================== END");
      callback(err, "convert fail.\n");
    } else {
      console.log("stdout =================== START");
      console.log(stdout)
      console.log("stdout =================== END");
      callback(null, 'convert success.\nJPG file save to /tmp/test.jpg\n');
    }
  });
};