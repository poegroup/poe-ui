/**
 * Module dependencies
 */

var React = require('react');
var assign = require('object-assign');
var createClass = React.createClass;
var el = React.createElement;

/**
 * Expose the PoeApp
 */

exports = module.exports = PoeApp;
exports['default'] = PoeApp;

/**
 * Create a PoeApp
 *
 * @param {Object} context
 */

function PoeApp(context) {
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    window.hyperFormat = context.format;
    window.hyperStore = context.store;
  }

  var routeOpts = context.router || {};
  delete context.router;

  var Routes = routeOpts.routes;
  if (!Routes) throw new Error('Missing routes');

  delete routeOpts.routes;

  var root = el(Routes, assign({
    format: context.format
  }, routeOpts));

  return el(withContext(context, root));
}

exports.React = React;

function withContext(context, child) {
  return createClass({
    displayName: 'PoeApp',

    childContextTypes: Object.keys(context).reduce(function(acc, key) {
      acc[key] = React.PropTypes.any;
      return acc;
    }, {}),

    getChildContext: function() {
      return context;
    },

    render: function() {
      return child;
    }
  });
}

/**
 * Expose React to the window
 */

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  window.React = React;
}

exports.__esModule = true
