/**
 * Module dependencies
 */

var stack = require('poe-ui-kit');
var envs = require('envs');
var fs = require('fs');
var read = fs.readFileSync;
var exists = fs.existsSync;
var oauth = require('./server/oauth');
var proxy = require('simple-http-proxy');

var NODE_ENV = envs('NODE_ENV', 'production');

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

  if (NODE_ENV === 'development') mountDevProxy(app, envs('API_URL'));

  oauth.attach(app, opts.auth);

  // remove the middleware we don't need
  app.remove('methodOverride');
  app.remove('json');
  app.remove('urlencoded');

  var routes = loadRoutes(routesPath);

  mountRoutes(app, routes);

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

  // files
  app.builder.addLoader('png', 'file-loader');
  app.builder.addLoader('jpg', 'file-loader');
  app.builder.addLoader('gif', 'file-loader');
  app.builder.addLoader('svg', 'file-loader');

  var rootFile = app.builder.sourcedir + '/root.js';
  app.builder.ast2template = {
    root: exists(rootFile) ? rootFile : null
  };

  return app;
};

/**
 * Expose the middleware
 */

exports.middleware = stack.middleware;

function loadRoutes(routesPath) {
  // var routes = read(routesPath, 'utf8');
  // TODO
}

function mountRoutes(app, routes, restricted) {
  var re = /^\/(build).*/;
  app.useAfter('router', function indexPage(req, res, next) {
    if (re.test(req.url)) return next();
    res.render('index.jade');
  });
}

function mountDevProxy(app, API_URL) {
  if (!API_URL) return;

  app.useAfter('cookieParser', '/api', 'api-proxy', proxy(API_URL.replace(/^ws/, 'http'), {xforward: headers, onrequest: function(opts, req) {
    delete opts.headers['if-none-match'];
    delete opts.headers.connection;
    if (!opts.headers.authorization && req.cookies && req.cookies._access_token) opts.headers.authorization = 'Bearer ' + req.cookies._access_token;
  }}));
}