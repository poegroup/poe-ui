/**
 * Module dependencies
 */

var stack = require('simple-stack-common');
var urlparse = require('url').parse;
var envs = require('envs');
var assets = require('simple-assets');
var oauth = require('./server/oauth');

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

  var root = opts.root || process.cwd();
  var restricted = opts.restricted;
  var CDN_URL = opts.cdn || envs('CDN_URL') || '';
  var STATIC_MAX_AGE = opts.staticMaxAge || envs.int('STATIC_MAX_AGE', 0);
  var API_URL = opts.apiUrl || envs('API_URL');
  var SITE_URL = opts.siteUrl || envs('SITE_URL');
  var ENABLED_FEATURES = opts.enabledFeatures || envs('ENABLED_FEATURES') || '';

  // Load in the routes
  if (!opts.routes) {
    try {
      opts.routes = require(root + '/public/javascripts/routes');
    } catch (e) {
      opts.routes = {'/': 'index'};
    }
  }
  var routes = Object.keys(opts.routes);

  // Load the package.json
  var package = {};
  try {
    package = require(root + '/package.json');
  } catch (e) {}

  function assetLookup(file, path, useCdn) {
    return (useCdn ? CDN_URL : '') + path + '/' + assets(file);
  }

  // TODO allow adding scripts and styles

  var styles = function(min, path) {
    return [
      assetLookup(min ? 'build/style.min.css' : 'build/style.css', path, min)
    ];
  }

  var scripts = function(min, path) {
    return [
      assetLookup(min ? 'build/require.min.js' : 'build/require.js', path, min),
      assetLookup(min ? 'build/vendor.min.js' : 'build/vendor.js', path, min),
      assetLookup(min ? 'build/app.min.js' : 'build/app.js', path, min)
    ];
  }

  /**
   * Create an app
   */

  var app = stack({
    base: headers
  });

  /**
   * Use jade as the default view engine
   */

  app.set('view engine', 'jade');
  app.engine('jade', require('jade').__express);

  /**
   * Set locals defauls
   */

  app.locals({
    app: package.name,
    description: package.description,
    author: package.author,
    env: {
      BROWSER_ENV: envs('NODE_ENV', 'production')
    }
  });

  /**
   * Expose a way to set browser env variables
   */

  app.env = function(key, value) {
    app.locals.env[key] = value;
    return app;
  };

  /**
   * Extra middleware
   */

  app.useBefore('router', stack.middleware.cookieParser());

  /**
   * Serve the static assets
   */

  app.useBefore('router', '/build', 'build', stack.middleware.static(root + '/build', {
    maxAge: STATIC_MAX_AGE
  }));

  app.useBefore('router', function assetLocals(req, res, next) {
    var min = req.get('x-env') === 'production';
    var path = urlparse(req.base).pathname;

    if (path === '/') path = '';

    res.locals({
      styles: styles(min, path),
      scripts: scripts(min, path),
      noscriptRedirect: !req.cookies.noscript,
      pretty: !min
    });
    next();
  });

  // Proxy the api
  var proxy = require('simple-http-proxy');
  if (API_URL) app.useBefore('base', '/api', 'api-proxy', proxy(API_URL, {xforward: headers}));

  /**
   * Use authentication middleware
   */

  var auth = oauth(opts.auth);
  app.useBefore('router', '/auth/login', 'auth:login', auth.login());
  app.useBefore('router', '/auth/register', 'auth:register', auth.login({register: 1}));
  app.useBefore('router', '/auth/callback', 'auth:callback', auth.login());
  app.useBefore('router', '/auth/logout', 'auth:logout', auth.logout());
  app.useBefore('router', '/auth', 'auth:root-redirect', function(req, res) {
    res.redirect(req.base);
  });

  /**
   * Set enabled feature flags
   */

  app.useBefore('router', '/', 'features', function(req, res, next) {
    if (req.get('x-env') !== 'production') return next();
    if (ENABLED_FEATURES !== req.cookies.features) res.cookie('features', ENABLED_FEATURES);
    next();
  });

  /**
   * Remove the middleware we don't need
   */

  app.remove('methodOverride');
  app.remove('json');
  app.remove('urlencoded');

  app.get('/noscript', function(req, res) {
    res.cookie('noscript', '1');
    res.render('noscript');
  });

  /**
   * Serve an error page for any unrecoverable errors on the client
   */

  app.get('/_error', function(req, res) {
    res.render('error', function(err, body) {
      if (!err) return res.send(body);
      res.render(__dirname + '/views/error');
    });
  });

  /**
   * Mount the routes
   */

  routes.forEach(function(route) {
    app.get(route, index);
  });

  /**
   * Index
   */

  function index(req, res, next){
    // If we don't have the site url set, get it from the header or env
    if (!res.locals.site) res.locals.site = req.get('x-ui-url') || SITE_URL || req.base;

    // Expose the base url to the view
    res.locals.base = req.base;

    auth.authenticate(restricted)(req, res, function(err) {
      if (err) return next(err);

      // TODO send dns-prefetch the api and cdn

      res.render(app.get('index view') || 'index');
    });
  };

  return app;
};

/**
 * Expose the middleware
 */

stack.middleware(exports.middleware = {});
