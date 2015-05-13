/**
 * Module dependencies
 */

var React = process.env.NODE_ENV === 'production' ? require('react') : require('react/addons');
var Router = require('react-router');
var el = React.createElement;

/**
 * Expose the PoeApp
 */

exports['default'] = PoeApp;

/**
 * Create a PoeApp
 *
 * @param {Object} routes
 * @param {String} name
 */

function PoeApp(element, context, cb) {
  cb = cb || function() {};
  var isString = typeof element === 'string';

  var router = Router.create({
    location: isString ? element : Router.HistoryLocation,
    routes: context.routes(el, $get, context)
  });

  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    window.hyperFormat = context.format;
    window.hyperStore = context.store;
  }

  router.run(function(Handler) {
    React.withContext(context, function() {
      var root = el(Handler);

      if (isString) return cb(null, React.renderToStaticMarkup.bind(null, root));
      return React.render(root, element);
    });
  });

  return router;
}

exports.React = React;

/**
 * Expose React to the window
 */

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  window.React = React;
}

function $get(path, parent, fallback) {
  for (var i = 0, child; i < path.length; i++) {
    if (!parent) return undefined;
    child = parent[path[i]];
    if (typeof child === 'function') parent = child.bind(parent);
    else parent = child;
  }
  return parent;
}
