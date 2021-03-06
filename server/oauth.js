/**
 * Module dependencies
 */

var qs = require('qs');
var URL = require('url');
var debug = require('debug')('poe-ui:oauth');

module.exports = function(r, app, opts) {
  if (!opts.oauthClientId) return;

  app.useBefore('router', '/auth/login', 'auth:login', login(opts, null, true));
  app.useBefore('router', '/auth/signup', 'auth:signup', login(opts, {signup: 1}, true));
  app.useBefore('router', '/auth/callback', 'auth:callback', callback(opts));
  app.useBefore('router', '/auth/logout', 'auth:logout', logout(opts));
  app.useBefore('router', '/auth', 'auth:root-redirect', function(req, res) {
    res.redirect(req.base);
  });

  if (opts.restricted) app.useBefore('router', '/', 'auth:restrict', login(opts));
};

function login(opts, additionalParams, explicitLogin) {
  var CLIENT_ID = opts.oauthClientId;
  var OAUTH_URL = opts.oauthUrl;
  additionalParams = additionalParams || {};

  return function oauthLogin(req, res, next) {
    var auth_url = req.get('x-auth-url') || OAUTH_URL;

    // we're already logged-in
    if (req.cookies._access_token || !CLIENT_ID || !auth_url) return explicitLogin ? res.redirect(req.base) : next();

    var params = {
      client_id: CLIENT_ID,
      redirect_uri: req.base + '/auth/callback',
      response_type: 'code',
      scope: Array.isArray(opts.scope) ? opts.scope.join(' ') : opts.scope,
      // TODO sign the state
      state: explicitLogin ? req.base : verifyState(req, req.get('referrer') || req.base + req.url)
    };

    for (var k in additionalParams) {
      params[k] = additionalParams[k];
    }

    debug('login', params);

    res.redirect(auth_url + '/authorize?' + qs.stringify(params));
  };
}

function error() {
  return function oauthError(req, res, next) {
    if (!req.query.error) return next();
    // TODO where should we redirect?
    res.redirect(req.base);
  };
}

function callback(opts) {
  var CLIENT_ID = opts.oauthClientId;
  var CLIENT_SECRET = opts.oauthClientSecret;

  return function oauthCallback(req, res, next) {
    var code = req.query.code;
    if (!code || !CLIENT_ID || !CLIENT_SECRET || !req.hyperclient) return res.redirect(req.base);

    var params = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: req.base + '/auth/callback'
    };

    req.hyperclient.submit('.oauth.authorization_code', params, function(err, body, resp) {
      debug('callback', err, body);
      if (err || !body || !body.access_token) return res.redirect(verifyState(req, req.query.state));

      res.cookie('_access_token', body.access_token, {
        secure: ~req.base.indexOf('https://'),
        maxAge: body.expires_in * 1000
      });

      res.redirect(verifyState(req, req.query.state));
    });
  };
}

function logout(opts) {
  var CLIENT_ID = opts.oauthClientId;
  var OAUTH_URL = opts.oauthUrl;

  return function oauthLogout(req, res, next) {
    res.clearCookie('_access_token', {
      secure: ~req.base.indexOf('https://')
    });

    res.redirect((req.get('x-auth-url') || OAUTH_URL) + '/logout?client_id=' + CLIENT_ID);
  };
}

function verifyState(req, location) {
  if (!location) return req.base;
  location = URL.parse(location);
  if (!location.host) return location.path;
  return URL.parse(req.base).host === location.host ?
    location.href :
    req.base;
}
