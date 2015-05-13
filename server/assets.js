var urlparse = require('url').parse;

module.exports = function(r, app, opts, NODE_ENV, middleware) {
  var defaultCdn = opts.cdnUrl;
  var root = opts.root;
  var DEVELOPMENT = NODE_ENV === 'development';

  app.useBefore('router', '/build', function build(req, res, next) {
    middleware.static(opts.root + '/build', {
      maxAge: req.env === 'production' ? 31557600 : 0
    })(req, res, next);
  });

  app.useBefore('router', function assetLocals(req, res, next) {
    var min = req.env === 'production';
    var cdn = req.get('x-cdn') || defaultCdn;
    var base = urlparse(req.base).pathname;
    if (base === '/') base = '';
    res.locals({
      cdn: cdn + base + '/build',
      scripts: format(cdn, min, base + '/build', 'scripts', [base + '/build/main.js']),
      styles: format(cdn, min, base + '/build', 'styles', []),
      chunks: format(cdn, min, base + '/build', 'chunks', []),
      base: base,
      pretty: !min,
      basePath: base
    });
    next();
  });

  function format(cdn, min, dir, type, fallback) {
    return DEVELOPMENT ? fallback : lookup(cdn, min, dir, type);
  }

  function lookup(cdn, min, dir, type) {
    // TODO maybe deprecate unminified support - the prod build doesn't do it now anyway...
    return (r(root + '/manifest.json')[type] || []).map(function(entry) {
      return cdn + dir + '/' + entry;
    });
  }
};