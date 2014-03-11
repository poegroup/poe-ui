/**
 * Module dependencies
 */

var passport = require('passport');
var envs = require('envs');
var OAuthStrategy = require('passport-oauth2').Strategy;

/**
 * Expose the simple auth methods
 */

module.exports = SimpleAuth;

function SimpleAuth(opts) {
  if (!(this instanceof SimpleAuth)) return new SimpleAuth(opts);
  this.opts = opts || {};
  this.name = this.opts.name || 'random name';
  this.cookieDomain = this.opts.cookieDomain;
  this.register(this.opts);
};

SimpleAuth.prototype.register = function(opts) {
  var AUTH_URL = opts.authURL || envs('AUTH_URL');
  var AUTHORIZATION_URL = opts.authorizationPath || '/authorize';
  var TOKEN_URL = opts.tokenPath || '/token';

  var strategy = new OAuthStrategy({
    clientID: envs('OAUTH_CLIENT_ID'),
    clientSecret: envs('OAUTH_CLIENT_SECRET'),
    authorizationURL: AUTHORIZATION_URL,
    tokenURL: TOKEN_URL,
    skipUserProfile: true
  },
  function(accessToken, refreshToken, profile, done) {
    profile = profile || {};
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    done(null, profile);
  });

  strategy.name = this.name;
  strategy._host = AUTH_URL;

  var _authenticate = strategy.authenticate;
  strategy.authenticate = function(req, options) {
    options = options || {};

    this._oauth2._baseSite = options.host || this._host;
    _authenticate.apply(this, arguments);
  };

  passport.use(strategy);
};

SimpleAuth.prototype.login = function(options) {
  var self = this;
  options = options || {};

  return function (req, res, next) {
    // If they're already signed in, don't do anything
    if (req.cookies._access_token && !req.query.code) return next();

    // Setup the options for passport
    options.callbackURL = req.base + '/auth/callback';
    options.state = (req.get('referrer') || '/');
    options.host = req.get('x-auth-url');

    // Profile the call
    var done = req.metric.profile('login');

    return passport.authenticate(self.name, options, function(err, profile) {
      // End profiling
      done();

      // We've got an error
      if (err) return next(err);

      // TODO handle oauth errors - like access denied
      if (!profile.accessToken) return res.redirect(req.query.state);

      // Expose the profile
      req.user = profile;

      // Expose the access token
      res.cookie('_access_token', profile.accessToken, {
        secure: ~req.base.indexOf('https://'),
        domain: self.cookieDomain
        // maxAge: profile.expires_in // TODO
      });

      res.redirect(req.query.state || req.base);
    })(req, res, next);
  };
};

SimpleAuth.prototype.logout = function() {
  return function(req, res, next) {
    // Clear the access token
    res.clearCookie('_access_token', {
      secure: ~req.base.indexOf('https://')
    });

    res.redirect((req.get('x-auth-url') || AUTH_URL) + '/logout');
  }
};

SimpleAuth.prototype.authenticate = function(restricted) {
  return restricted
    ? this.login()
    : noop;
};

function noop(req, res, next) {
  next();
};
