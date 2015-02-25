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

exports = module.exports = function(routesPath, opts) {
  if (!routesPath || typeof routesPath !== 'string') throw new Error('Missing routes path parameter');
  opts = opts || {};

  var app = stack(opts);

  var API_URL = opts.apiUrl || envs('API_URL');
  if (API_URL) app.useBefore('base', '/api', 'api-proxy', proxy(API_URL, {xforward: headers, onrequest: function(opts) {
    delete opts.headers['if-none-match'];
    delete opts.headers.connection;
  }}));

  // TODO init auth
  // initAuth(app, opts.auth)

  // remove the middleware we don't need
  app.remove('methodOverride');
  app.remove('json');
  app.remove('urlencoded');

  var routes = loadRoutes(routesPath);

  mountRoutes(app, routes, opts.restricted);

  // setup loaders
  app.builder.module.loaders.push(
    {test: /\.(js)$/, exclude: /node_modules/, loader: 'esnext-loader'},
    {test: /\.(js)$/, include: /node_modules\/[^\/]+\/blocks/, loader: 'esnext-loader'}
  );
  app.builder.resolve.extensions.push('.jade');
  app.builder.addLoader('jade', (process.env.NODE_ENV === 'development' ? 'react-component-loader!' : '') + 'esnext-loader!onus-loader!ast2template-loader!jade2ast-loader');

  app.builder.addLoader(/\.(ess\?(dynamic|raw))$/, 'ess-loader!esnext-loader!ast2template?pass-through=1!ess2ast-loader');
  app.builder.addStyle(/\.(ess)$/, 'css-loader!autoprefixer-loader!ess-loader!esnext-loader!ast2template?pass-through=1!ess2ast-loader');

  app.builder.addLoader('yml', 'json-loader!yaml-loader');

  // TODO mount the app api
  // api(app, routes);

  return app;
};

/**
 * Expose the middleware
 */

exports.middleware = stack.middleware;

function loadRoutes(routesPath) {
  // var routes = read(routesPath, 'utf8');
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
