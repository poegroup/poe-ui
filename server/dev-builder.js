module.exports = function initBuilder(r, app, opts, NODE_ENV) {
  var DEVELOPMENT = NODE_ENV === 'development';
  if (!DEVELOPMENT) return;

  var WebpackDevServer = r('webpack-dev-server');
  var socketio = r('webpack-dev-server/node_modules/socket.io');
  var colors = require('colors');

  if (!WebpackDevServer || !socketio) return;

  app.on('ready', function(httpServer) {
    var config = app.builder;

    var compiler = config.load();
    var WEBPACK_DEBUG = typeof process.env.WEBPACK_DEBUG !== 'undefined';
    var server = new WebpackDevServer(compiler, {
      contentBase: false,
      publicPath: '',
      hot: true,
      stats: WEBPACK_DEBUG
    });

    app.use('/build', 'webpack', server.app);

    if (!WEBPACK_DEBUG) {
      compiler.plugin('done', function(stats) {
        var warns = stats.compilation.warnings;
        if (warns.length) {
          console.log('====WARNINGS====\n'.yellow);
          warns.forEach(function(warn) {
            console.warn(((warn.module || {}).context || '').yellow + ':\n' + warn.message + '\n');
          })
        }

        var errs = stats.compilation.errors;
        if (errs.length) {
          console.error('====ERRORS====\n'.red);
          errs.forEach(function(err) {
            console.error((err.module || {}).context.red + ':\n' + err.stack || err.message || err);
          });
        }
      });
    }

    server.io = socketio.listen(httpServer, {
      'log level': 1
    });
    server.io.sockets.on('connection', function(socket) {
      if (this.hot) socket.emit('hot');
      if (!this._stats) return;
      this._sendStats(socket, this._stats.toJson());
    }.bind(server));

    process.on('SIGTERM', close);
    process.on('SIGINT', close);
    function close() {
      server.middleware.close();
    }
  });
}
