module.exports = function(r, app, opts) {
  var API_URL = opts.apiUrl;
  var HyperClient = r('hyperagent');
  if (!API_URL || !HyperClient) return;
  API_URL = API_URL.replace(/^ws/, 'http');

  app.useBefore('router', function hyperclient(req, res, next) {
    // TODO setup caching
    req.hyperclient = new HyperClient(req.get('x-api-url') || API_URL);
    next();
  });
};