module.exports = function(r, app, opts) {
  var API_URL = opts.apiUrl;
  var HyperClient = r('hyperagent');
  if (!API_URL || !HyperClient) return;
  API_URL = API_URL.replace(/^ws/, 'http');

  app.useBefore('router', function hyperclient(req, res, next) {
    // TODO setup caching
    req.hyperclient = new HyperClient(req.get('x-api-url') || API_URL);
    if (req.cookies._access_token) req.hyperclient.set('authorization', 'Bearer ' + req.cookies._access_token);

    req.get('cookie') && client.set('cookie', req.get('cookie'));
    req.get('x-forwarded-for') && client.set('x-forwarded-for', req.get('x-forwarded-for'));
    req.get('referer') && client.set('referer', req.get('referer'));
    req.get('user-agent') && client.set('user-agent', req.get('user-agent'));

    next();
  });
};