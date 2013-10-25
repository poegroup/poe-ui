/**
 * Module dependencies
 */

var accessToken = require('access-token')();
var envs = require('envs');
var metric = require('metric-log');
var log = require('log');

module.exports = function(app, options) {
  /**
   * Track the session
   */

  if (accessToken) options.session = accessToken.slice(0, 32);

  /**
   * Create a context
   */

  var ctx = metric.context(options.context);

  /**
   * Only enable logging in prod
   */

  if (options.collector) ctx.log = log(options.collector, {app: app});

  return ctx;
};
