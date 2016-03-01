/**
 * Module dependencies
 */

var React = require('react');
var assign = require('object-assign');
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

function PoeApp(element, context) {
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    window.hyperFormat = context.format;
    window.hyperStore = context.store;
  }

  var metrics = recordMetrics(context.store, context.events) || function() {};

  var routeOpts = context.router || {};
  delete context.router;

  return React.withContext(context, function() {
    var Routes = routeOpts.routes;
    if (!Routes) throw new Error('Missing routes');

    delete routeOpts.routes;

    var root = el(Routes, assign({
      format: context.format,
      onChange: metrics
    }, routeOpts));

    if (typeof element === 'string') return React.renderToStaticMarkup(root);
    return React.render(root, element);
  });
}

exports.React = React;

/**
 * Expose React to the window
 */

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  window.React = React;
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
    var end = events.profile(state.activeComponentName, {
      href: state.pathname + state.search,
      absolute: initialLoad
    }, initialLoad);

    initialLoad = false;

    store.once('complete', function() {
      end();
    });
  };
}
