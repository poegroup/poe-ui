module.exports = function(r, app, opts) {
  var jade = r('jade');
  if (!jade) return;
  // use jade as the view engine
  app.set('view engine', 'jade');
  app.set('views', opts.entry);
  app.engine('jade', jade.__express);

  var re = /^\/(build).*/;
  app.useAfter('router', function indexPage(req, res, next) {
    if (re.test(req.url)) return next();
    res.render('index.jade');
  });
};