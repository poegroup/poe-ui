/**
 * Module dependencies
 */

var angular = window.angular || require('/camshaft-component-angular');
var hyper = require('ng-hyper');
var feature = require('ng-feature');
var translate = require('ng-hyper-translate');
var logger = require('./lib/logger');
var token = require('access-token');
var envs = require('envs');

/**
 * Create a simple-ui app
 *
 * @param {String} mod
 * @param {Array} deps
 * @param {Function} require
 * @return Module
 */

exports = module.exports = function(mod, deps, $require) {
  if (!deps) return angular.module(mod);
  if (!$require) throw new Error('simple-ui requires passing the require function on creation');

  deps.push(hyper.name);
  deps.push(translate.name);
  deps.push(feature.name);

  var app = angular.module(mod, deps);
  app.name = mod;

  app.initPartial = initRequire('../partials/', $require);
  initRoutes(app, $require);

  app.initDirective = initRequire('./directives/', $require, app);
  app.initController = initRequire('./controllers/', $require, app);
  app.initFilter = initRequire('./filters/', $require, app);
  app.initService = initRequire('./services/', $require, app);

  app.metric = initMetric(app);
  // TODO init analytics
  initHttp(app);

  app.start = initStart(app, $require);

  return app;
};

/**
 * Initialize routes
 */

function initRoutes(app, $require) {
  var routes = $require('./routes');

  // we have to require the partials before the config runs
  var config = {};
  angular.forEach(routes, function(opts, path) {
    if (angular.isString(opts)) opts = {templateUrl: opts, _route: opts};
    if (opts.templateUrl) opts.templateUrl = app.initPartial(opts.templateUrl);
    config[path] = opts;
  });

  app.config([
    '$routeProvider',
    '$locationProvider',
    function($route, $location) {
      angular.forEach(config, function(opts, path) {
        if (path === '_') return $route.otherwise(opts);
        $route.when(path, opts);
      });
      $location.html5Mode(true).hashPrefix('!');
    }
  ]);
  return routes;
}

/**
 * Helper function for creating initializers
 */

function initRequire(prefix, $require, app) {
  return function(path) {
    var mod = $require(prefix + path);
    if (app) return mod(app);
    return mod;
  };
}

/**
 * Initialize performance metrics
 *
 * @todo
 */

function initMetric(app) {
  var log = logger(app.name, {
    collector: envs('SYSLOG_COLLECTOR')
  });

  return log;
}

/**
 * Initialize business metrics
 *
 * @todo
 */

function initAnalytics() {
  return {
    pageview: function() {}
  };
}

/**
 * Initialize the $http module
 */

function initHttp(app) {
  app.config([
    '$provide',
    '$httpProvider',
    function ($provide, $http) {
      var api = envs('API_URL');
      if (api) $provide.value('hyperHttpRoot', api);

      // TODO redirect to login if the token is no longer valid
      $http.defaults.transformRequest.push(function(data, get) {
        var headers = get();
        headers['Authorization'] = token.bearer();
        headers['Accept'] = 'application/hyper+json';
        return data;
      });
    }
  ]);
}

/**
 * Initialize start function
 */

function initStart(app) {
  return function start() {
    app.run([
      '$rootScope',
      '$location',
      function($rootScope, $location) {
        $rootScope.$on('$routeChangeSuccess', function(currentRoute, conf) {
          if (currentRoute.title) $rootScope.title = currentRoute.title;
          if (conf && conf.$$route && conf.$$route._route) $rootScope._route = conf.$$route._route;
        });
      }
    ]);

    // show the feature UI
    setTimeout(function() {
      require('feature-ui')();
    }, 10);
  };
}
