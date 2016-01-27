module.exports = function(r, app, opts, NODE_ENV) {
  var proxy = r('simple-http-proxy', 'silent');
  var API_URL = opts.proxyApiUrl;
  if (!API_URL || NODE_ENV !== 'development' || !proxy) return;
  API_URL = API_URL.replace(/^ws/, 'http');

  app.useAfter('cookieParser', '/api', 'api-proxy', proxy(API_URL, {
    xforward: opts.xforward,
    onrequest: onrequest
  }));
};

function onrequest(opts, req) {
  delete opts.headers['if-none-match'];
  delete opts.headers.connection;
  if (!opts.headers.authorization && req.cookies && req.cookies._access_token) opts.headers.authorization = 'Bearer ' + req.cookies._access_token;
}
