module.exports = function(r, app, opts, NODE_ENV) {
  app.useBefore('emptyFavicon', function env(req, res, next) {
    req.env = req.query._env || req.get('x-env') || NODE_ENV;
    next();
  });
};