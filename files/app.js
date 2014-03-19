/**
 * Module dependencies
 */

var stack = require('poe-ui');
var envs = require('envs');

/**
 * Expose the app
 */

var app = module.exports = stack({
  restricted: false
});

/**
 * Setup app-wide locals
 */

app.env('API_URL', '/api');
