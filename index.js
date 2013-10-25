/**
 * Module dependencies
 */

var envs = require('envs');

/**
 * Load the environment
 */

if (window.env) envs.set(window.env);

var angular = require('angular');
var hyper = require('ng-hyper');
var logger = require('./lib/logger');
var hyperagent = require('hyperagent');
var token = require('access-token');
var each = require('each');
var featureUI = require('feature-ui');

/**
 * Expose creating an app
 */

exports = module.exports = function(mod, deps) {
  if (!deps) return angular.module(mod);
  deps.push(hyper.name);
  var app = angular.module(mod, deps);
  app.name = mod;
  return app;
};

/**
 * Start an app with options
 */

exports.run = function(app, options, loadPartial) {

  /**
   * Initialize the logger
   */

  var log = window.metric = logger(app.name, {
    collector: options.collector || envs('SYSLOG_COLLECTOR'),
    context: options.context || {}
  });

  /**
   * Initialize the hyperagent client
   */

  hyperagent.set(token.auth());
  hyperagent.profile = log.profile.bind(log);

  // TODO initialize in-progress
  // TODO initialize subscriptions

  var routes = options.routes || {'/': 'index'};

  app.config([
    '$routeProvider',
    '$locationProvider',

    function($routeProvider, $locationProvider) {

      each(routes, function(path, opts) {
        if (typeof opts === 'string') opts = {templateUrl: opts};
        // Require the template name
        if (loadPartial && opts.templateUrl) opts.templateUrl = loadPartial(opts.templateUrl);

        // Handle a catch all here
        if (path === '_') return $routeProvider.otherwise(opts);

        $routeProvider.when(path, opts);
      });

      $locationProvider.html5Mode(true).hashPrefix('!');
    }
  ]);

  app.run([
    '$rootScope',
    '$location',

    function($rootScope, $location) {
      var done;

      $rootScope.$on('$routeChangeStart', function() {
        done = log.profile('route_time');
      });

      $rootScope.$on('$routeChangeSuccess', function(currentRoute) {
        if (options.analytics) analytics.pageview();
        if (currentRoute.title) $rootScope.title = currentRoute.title;
        done({path: $location.path()});
      });
    }
  ]);

  /**
   * Show the feature UI
   */

  setTimeout(featureUI, 0);
}
