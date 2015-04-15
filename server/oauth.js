/**
 * Module dependencies
 */

var envs = require('envs');
var qs = require('qs');
var hyperagent = require('hyperagent');
var URL = require('url');

exports.attach = function(app, conf, client) {
  conf = conf || {};
  if (!envs('OAUTH_CLIENT_ID')) return;

  app.useBefore('router', '/auth/login', 'auth:login', login(conf, null, true));
  app.useBefore('router', '/auth/signup', 'auth:signup', login(conf, {signup: 1}, true));
  app.useBefore('router', '/auth/callback', 'auth:callback', callback(conf, client));
  app.useBefore('router', '/auth/logout', 'auth:logout', logout(conf));
  app.useBefore('router', '/auth', 'auth:root-redirect', function(req, res) {
    res.redirect(req.base);
  });

  if (conf.restricted) app.useBefore('router', '/', 'auth:restrict', login(conf));
};

function login(opts, additionalParams, explicitLogin) {
  var CLIENT_ID = envs('OAUTH_CLIENT_ID');
  var OAUTH_URL = envs('OAUTH_URL');
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
      state: explicitLogin ? req.base : verifyState(req, req.get('referrer'))
    };

    for (var k in additionalParams) {
      params[k] = additionalParams[k];
    }

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

function callback(opts, redirect) {
  var CLIENT_ID = envs('OAUTH_CLIENT_ID');
  var CLIENT_SECRET = envs('OAUTH_CLIENT_SECRET');
  var API_URL = envs('API_URL', '').replace(/^ws/, 'http');

  return function oauthCallback(req, res, next) {
    var code = req.query.code;
    var apiUrl = req.get('x-api-url') || API_URL;
    if (!code || !CLIENT_ID || !CLIENT_SECRET || !apiUrl) return res.redirect(req.base);

    var params = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: req.base + '/auth/callback'
    };

    hyperagent(apiUrl).submit('.oauth.authorization_code', params, function(err, body, resp) {
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
  var CLIENT_ID = envs('OAUTH_CLIENT_ID');
  var OAUTH_URL = envs('OAUTH_URL');

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