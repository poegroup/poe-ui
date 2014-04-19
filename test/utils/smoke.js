/**
 * Module dependencies
 */

var phantomjs = require('phantomjs').path;
var spawn = require('child_process').spawn;

module.exports = function(url, fn) {
  var proc = spawn(phantomjs, [__dirname + '/phantom-smoke-test.js', url]);

  proc.stdout.on('data', function(data) {
    process.stdout.write(data);
  });
  proc.stderr.on('data', function(data) {
    process.stderr.write(data);
  });

  proc.on('error', fn);

  proc.on('close', function(status) {
    if (status !== 0) return fn(new Error('exited with ' + status));
    fn();
  });
};
