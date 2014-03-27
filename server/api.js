/**
 * Module dependencies
 */

var urlparse = require('url').parse;

module.exports = api;

/**
 * Mount the api for the ui
 */

function api(app, routes) {
  var regexp = /:([\w-\.]+)/g;

  app.get('/_', function(req, res) {
    var body = {
      href: req.base + '/_',
      routes: {}
    };
    routes.forEach(function(route) {
      var path = route.path;
      var name = route.view;
      var form = body.routes[name] = {
        action: req.base + '/_/routes',
        method: 'GET',
        input: {
          _template: {
            type: 'hidden',
            value: path
          }
        }
      };
      var input = form.input;

      (path.match(regexp) || []).forEach(function(param) {
        input[param.substr(1)] = {
          type: 'text'
        };
      });
    });
    res.json(body);
  });

  app.get('/_/routes', function(req, res) {
    var template = req.query._template;
    if (template === '/') template = '';
    var values = req.query;
    var missing = [];
    var warnings = [];

    var body = {
      href: req.base + req.url
    };

    var baseObj = urlparse(req.base);

    var result = req.base + template.replace(regexp, function(full, param) {
      var href = values[param];
      if (values.hasOwnProperty(param)) {
        var warn = validateHref(href, baseObj, param);
        if (warn) warnings.push(warn);
        return websafe(href);
      }
      missing.push(param);
      return '-';
    });

    if (missing.length) {
      body.error = {
        message: 'Missing arguments',
        missing: missing
      };
    } else {
      body.url = result;
    }

    if (warnings.length) {
      body.warnings = warnings;
    }

    res.json(body);
  });

  function validateHref(href, base, param) {
    if (href.indexOf('http') !== 0 && href.indexOf('/') !== 0) return '"' + href + '" passed as "' + param + '" doesn\'t look like a url. It should start with "http(s)" or "/"'
    var obj = urlparse(href);
    if (obj.host && base.host !== obj.host) return '"' + href + '" passed as "' + param + '" may have CORS problems';
    if (obj.protocol && base.protocol !== obj.protocol) return '"' + href + '" passed as "' + param  + '" may have protocol mismatch problems';
  }
}

/**
 * Websafe encode a string
 */

function websafe(str) {
  return (new Buffer(str))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
