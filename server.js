/**
 * Module dependencies
 */

var stack = require('poe-ui-kit');
var proxy = require('simple-http-proxy');
var envs = require('envs');
var read = require('fs').readFileSync;

/**
 * Forwarding headers
 */

var headers = {
  port: 'x-orig-port',
  proto: 'x-orig-proto',
  path: 'x-orig-path',
  host: 'x-orig-host'
};

/**
 * Create a poe-ui app
 */

module.exports = function(routesPath, opts) {
  if (!routesPath || typeof routesPath !== 'string') throw new Error('Missing routes path parameter');
  opts = opts || {};

  var app = stack(opts);

  var API_URL = opts.apiUrl || envs('API_URL');
  if (API_URL) app.useBefore('base', '/api', 'api-proxy', proxy(API_URL, {xforward: headers}));

  // TODO init auth
  // initAuth(app, opts.auth)

  // remove the middleware we don't need
  app.remove('methodOverride');
  app.remove('json');
  app.remove('urlencoded');

  var routes = loadRoutes(routesPath);

  mountRoutes(app, routes, opts.restricted);

  // TODO mount the app api
  // api(app, routes);

  return app;
};

function loadRoutes(routesPath) {
  var routes = read(routesPath, 'utf8');
  // TODO
};

function mountRoutes(app, routes, restricted) {
  app.get('*', isNotReserved, function(req, res) {
    res.render('index.jade');
  });
}

var re = /^\/(build|api).*/;
function isNotReserved(req, res, next) {
  if (re.test(req.url)) return next('route');
  next();
}
