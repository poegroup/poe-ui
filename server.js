/**
 * Module dependencies
 */

var stack = require('poe-ui-kit');
var envs = require('envs');
var proxy = require('simple-http-proxy');
var oauth = require('./server/oauth');
var api = require('./server/api');

/**
 * Forwarding headers
 */

var headers = {
  host: 'x-orig-host',
  path: 'x-orig-path',
  port: 'x-orig-port',
  proto: 'x-orig-proto'
};

/**
 * Expose the app
 */

exports = module.exports = function(opts) {
  opts = opts || {};

  // create an app
  var app = stack(opts);

  // proxy the api
  var API_URL = opts.apiUrl || envs('API_URL');
  if (API_URL) app.useBefore('base', '/api', 'api-proxy', proxy(API_URL, {xforward: headers}));

  // init authentication middleware
  initAuth(app, opts.auth);

  // remove the middleware we don't need
  app.remove('methodOverride');
  app.remove('json');
  app.remove('urlencoded');

  // serve an error page for any unrecoverable errors on the client
  app.get('/_error', errorRoute());

  // load in the routes
  var routes = normalizeRoutes(loadRoutes(app.get('root'), opts.routes));

  // mount the app routes
  mountRoutes(app, routes, opts.restricted);

  // init the ui api
  api(app, routes);

  // init the lr server
  if (envs('NODE_ENV') !== 'development') return app;

  var LR = require('lr');
  var lr = new LR();
  app.use('/livereload.js', lr.client());
  app.on('ready', function(server) {
    lr.attach(server);
  });

  lr.watch('public/stylesheets/*', 'make build/style.css', true);
  lr.watch('public/!(stylesheets)/*', 'make build');
  lr.watch('components/**', 'rm build/vendor.js && make build/vendor.js && touch public/stylesheets/index.styl');
  lr.watch('component.json', 'make');
  lr.watch('views/**');
  lr.watch('build/style.css');

  lr.start(function(path) {
    console.log('[LR]', path);
  });

  return app;
};

/**
 * Expose the middleware
 */
exports.middleware = stack.middleware;

/**
 * Initialize the auth endpoints
 */

function initAuth(app, conf) {
  var auth = oauth(conf);
  app.useBefore('router', '/auth/login', 'auth:login', auth.login());
  app.useBefore('router', '/auth/register', 'auth:register', auth.login({register: 1}));
  app.useBefore('router', '/auth/callback', 'auth:callback', auth.login());
  app.useBefore('router', '/auth/logout', 'auth:logout', auth.logout());
  app.useBefore('router', '/auth', 'auth:root-redirect', function(req, res) {
    res.redirect(req.base);
  });

  app.restrict = auth.authenticate;
}

/**
 * Initialize an error route
 */

function errorRoute() {
  return function(req, res) {
    res.render('error', function(err, body) {
      if (!err) return res.send(body);
      res.render(__dirname + '/views/error');
    });
  };
}

/**
 * Load application routes
 */

function loadRoutes(root, routes) {
  if (routes) return routes;
  try {
    return require(root + '/public/javascripts/routes');
  } catch (e) {
    return {'/': 'index'};
  }
}

/**
 * Normalize the routes into a config object
 */

function normalizeRoutes(routes) {
  return Object.keys(routes).map(function(path) {
    var conf = routes[path];
    if (typeof conf === 'string') conf = {view: conf};
    conf.path = path;
    return conf;
  });
}

/**
 * Mount the ui routes on the server
 */

function mountRoutes(app, routes, restricted) {
  var restrict = app.restrict;
  routes.forEach(function(conf) {
    initRoute(app, conf, restrict(restricted || conf.restricted));
  });
}

/**
 * Initialize a route from a configuration
 */

function initRoute(app, conf, restrict) {
  var SITE_URL = envs('SITE_URL');
  app.get(conf.path, restrict, function(req, res, next) {
    // If we don't have the site url set, get it from the header or env
    if (!res.locals.site) res.locals.site = req.get('x-site-url') || SITE_URL || req.base;

    // Expose the base url to the view
    res.locals.base = req.base;
    res.render(app.get('index view') || 'index');
  });
}
