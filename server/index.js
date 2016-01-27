/**
 * Module dependencies
 */

var stack = require('simple-stack-common');
var resolve = require('path').resolve;

var NODE_ENV = process.env.NODE_ENV || 'production';

var xforward = {
  host: 'x-orig-host',
  path: 'x-orig-path',
  port: 'x-orig-port',
  proto: 'x-orig-proto'
};

exports = module.exports = function(opts) {
  opts = opts || {};
  opt('root', process.cwd());
  opt('entry', opts.root + '/src');
  opt('parseCookies', true);
  opt('parseBody', false);
  opt('cdnUrl', process.env.CDN_URL || '');
  opt('apiUrl', process.env.API_URL);
  opt('proxyApiUrl', opts.apiUrl);
  opt('xforward', xforward);
  opt('oauthClientId', process.env.OAUTH_CLIENT_ID);
  opt('oauthClientSecret', process.env.OAUTH_CLIENT_SECRET);
  opt('oauthUrl', process.env.OAUTH_URL);
  opt('assetCache', process.env.ASSET_CACHE);

  var app = stack({
    base: xforward
  });

  app.locals({
    // app: pkg.name,
    // description: pkg.description,
    // author: pkg.author,
    env: {
      BROWSER_ENV: NODE_ENV,
      API_URL: opts.apiUrl
    }
  });

  // expose a way to set browser environment variables
  app.env = function(key, value) {
    app.locals.env[key] = value;
  };

  app.useBefore('router', function applyEnv(req, res, next) {
    var env = {};
    var v;
    for (var k in app.locals.env) {
      v = app.locals.env[k];
      if (typeof v === 'function') env[k] = v(req, res);
      else env[k] = v;
    }
    res.locals.env = env;
    next();
  });

  if (opts.parseCookies) app.useBefore('router', stack.middleware.cookieParser());

  if (!opts.parseBody) {
    app.remove('methodOverride');
    app.remove('json');
    app.remove('urlencoded');
  }

  load(app, opts);

  function opt(name, def) {
    opts[name] = typeof opts[name] === 'undefined' ? def : opts[name];
  }

  return app;
};

exports.middleware = stack.middleware;

function load(app, opts) {
  function r(path, mode) {
    path = r.resolve(path, mode);
    if (!path) return null;
    return require(path);
  }

  r.missing = {};

  r.resolve = function(path, mode) {
    try {
      return require.resolve(resolve(opts.root + '/node_modules', path));
    } catch (e) {
      if (mode === 'silent') return null;
      console.error(path + ' missing. unexpected behavior may occur if not added to the package.json');
      if (mode === 'warn') return null;
      r[path] = true;
      r.hasMissing = true
    }
  };

  [
    'builder',
    'assets',
    'env',
    'hyperclient',
    'features',
    'dev-builder',
    'dev-proxy',
    'oauth',
    'render'
  ].forEach(function(plugin) {
    require('./' + plugin)(r, app, opts, NODE_ENV, stack.middleware);
  });

  if (r.hasMissing) {
    console.error();
    console.error('Missing required modules. please install with:');
    console.error();
    console.error('    npm i --save ' + Object.keys(r.missing).join(' ') + '`');
    console.error();
    process.exit(1);
  }
}
