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

  var metrics = recordMetrics(context.store, context.events) || function() {};

  router.run(function(Handler, state) {
    metrics(state);

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

function recordMetrics(store, events) {
  if (!events) return;

  if (events.measure) store.on('change', function(href, time, err, headers) {
    var name = (headers || {})['x-res'];
    if (!name) return;

    events.measure('store.' + name, time, 'ms', {
      href: href,
      absolute: false,
      error: err
    });
  });

  if (!events.profile) return;

  var initialLoad = true;

  return function(state) {
    var name = state.routes.reduce(function(acc, route) {
      if (route.name) acc.push(route.name);
      return acc;
    }, ['route']).join('.');

    var end = events.profile(name, {
      href: state.path,
      absolute: initialLoad
    }, initialLoad);

    initialLoad = false;

    store.once('complete', function() {
      end();
    });
  };
}
