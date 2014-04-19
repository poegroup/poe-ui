/**
 * Module dependencies
 */

var should = require('should');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');
var rimraf = require('rimraf');
var merge = require('utils-merge');
var smoke = require('../utils/smoke');
var openport = require('openport').find;

describe('cli', function() {
  var dir;
  beforeEach(function(fn) {
    dir = '/tmp/poe-app-ui-' + (Math.random() * 1e10 | 0);
    fs.mkdir(dir, fn);
  });

  afterEach(function(fn) {
    rimraf(dir, fn);
  });

  it('should create a working application', function(done) {
    var test = this;
    test.runnable().clearTimeout();
    var poe = process.cwd();
    var env = merge({POE_UI: poe}, process.env);
    var proc = spawn(poe + '/bin/poe-ui-create', [], {env: env, cwd: dir});

    proc.stdin.write('my-test-app\nthis is a description\npoe-app\n');

    proc.stdout.on('data', function(data) {
      process.stdout.write(data);
    });
    proc.stderr.on('data', function(data) {
      process.stdout.write(data);
    });
    proc.on('error', done);

    proc.on('close', function(status) {
      if (status !== 0) return done(new Error('exited with ' + status));

      linkClient(dir, function(err) {
        if (err) return done(err);

      openport(function(err, port) {
        if (err) return done(err);
        var error, started;
        var env = merge({PORT: port}, process.env);

        var server = spawn('make', ['start'], {env: env, cwd: dir});

        function smokeTest() {
          started = true;
          smoke('http://localhost:' + port, function(err) {
            error = err;
            server.kill();
          });
        }

        server.stdout.on('data', function(data) {
          if (~data.toString().indexOf('Server listening')) smokeTest();
        });

        server.on('close', function(status) {
          if (error) return done(error);
          if (started) return done();
          if (status !== 0) return done(new Error('exited with ' + status));
          done(new Error('Failed'));
        });
      });

      });
    });
  });
});

function linkClient(dir, fn) {
  var root = process.cwd();
  var target = dir + '/components/poegroup-poe-ui';
  rimraf(target, function(err) {
    fs.symlink(root, target, function(err) {
      if (err) return fn(err);
      rimraf(dir + '/build/vendor.js', function(err) {
        if (err) return fn(err);
        exec('make build', {cwd: dir}, fn);
      });
    });
  });
}
