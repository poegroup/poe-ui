/**
 * Module dependencies
 */

var angular = window.angular;
var hyper = require('ng-hyper');
var feature = require('ng-feature');
var translate = require('ng-hyper-translate');
var logger = require('./client/logger');
var token = require('access-token');
var envs = require('envs');
var toCamelCase = require('to-camel-case');

/**
 * setup different types of methods
 */

var TYPES = [
  'view',
  'directive',
  'controller',
  'service',
  'filter'
];

/**
 * Expose App constructor
 */

exports = module.exports = App;

/**
 * Initialize a poe-ui app
 *
 * @param {String} name
 */

function App(name) {
  if (!(this instanceof App)) return new App(name);

  var self = this;
  self.name = name;
  self.deps = [hyper.name, translate.name, feature.name];
  self.configures = [cachePartials(this)];
  types(function(type) {
    self[type + 's'] = {};
  });
}

/**
 * Use a plugin
 *
 * @param {String|Object|Function} dep
 */

App.prototype.use = function(dep) {
  if (typeof dep === 'function') return dep(this);
  if (dep.name) return this.deps.push(dep.name);
  this.deps.push(dep);
};

/**
 * Load the routes
 *
 * @param {Object} routes
 */

App.prototype.routes = function(routes) {
  this.routes = routes;
};

/**
 * Add a configure function
 *
 * @param {Function} fn
 */

App.prototype.configure = function(fn) {
  this.configures.push(fn);
};

/**
 * Start the application
 *
 * @param {Object} scope
 * @param {Function} fn
 */

App.prototype.start = function(scope, fn) {
  var self = this;
  var mod = self.module = angular.module(self.name, self.deps);
  mod.name = self.name;

  envs.set(scope);

  types(function(type) {
    if (type === 'view') return;
    var confs = self[type + 's'];
    angular.forEach(confs, function(conf, name) {
      if (typeof conf === 'function') return conf(mod);
      mod[type](name, conf);
    });
  });

  initRoutes(mod, self.routes, self.views, self.controllers);
  initHttp(mod);

  if (fn) self.configures.push(fn);

  start(mod, self);

  angular.bootstrap(document, [self.name]);

  return mod;
};

/**
 * Setup the type registration methods
 */

types(function(type) {
  var plural = type + 's';
  App.prototype[type] = function(name, conf) {
    if (type === 'view') this[plural][name.replace('.jade', '').replace('.html', '')] = conf;
    else name = toCamelCase(name);
    if (type === 'controller') name = toController(name);
    this[plural][name] = conf;
  };
});

/**
 * Iterate over the supported types
 */

function types(fn) {
  angular.forEach(TYPES, fn);
}

/**
 * Convert a view name to PascalCase
 */

function toController(str) {
  return str.charAt(0).toUpperCase() + str.slice(1) + 'Controller';
}

/**
 * Initialize routes
 */

function initRoutes(app, routes, partials, controllers) {
  // we have to require the partials before the config runs
  var config = {};
  angular.forEach(routes || {}, function(opts, path) {
    if (angular.isString(opts)) opts = {view: opts, _route: opts};
    if (opts.view) {
      opts.template = partials[opts.view] || partials['/partials/' + opts.view];
      var controller = toController(opts.view);
      if (controllers[controller]) opts.controller = controller;
    }
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
}

/**
 * Initialize partials
 */

function cachePartials(app) {
  return function($injector) {
    var cache = $injector.get('$templateCache');
    angular.forEach(app.views, function(view, name) {
      cache.put(name, view);
    });
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

function start(mod, app) {
  mod.run([
    '$rootScope',
    '$location',
    '$injector',
    function($rootScope, $location, $injector) {
      angular.forEach(app.configures, function(fn) {
        fn($injector);
      });
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
}
