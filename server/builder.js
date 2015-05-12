/**
 * Module dependencies
 */

var fs = require('fs');
var exists = fs.existsSync;

module.exports = function(r, app, opts, NODE_ENV) {
  var Builder = r('directiv-core-builder');
  var webpack = r('webpack');
  if (!Builder) return;
  var entry = opts.entry;
  var builder = app.builder = Builder(entry, webpack);

  var es6 = load('babel-loader?optional=runtime&modules=commonStrict&cacheDirectory=/tmp');
  var ast2template = load('ast2template-loader?root=' + r.resolve(entry + '/root.js', 'silent'));

  /**
   * JS
   */

  builder.module.loaders.push({
    test: /\.(js)$/,
    exclude: /node_modules/,
    loader: es6
  });
  builder.module.loaders.push({
    test: /\.(js)$/,
    include: /node_modules\/[^\/]+\/blocks/,
    loader: es6
  });

  builder.resolve.extensions.push('.json');
  builder.addLoader('json', load('json-loader'));

  /**
   * Markup
   */

  builder.resolve.extensions.push('.jade');
  builder.addLoader('jade', load((NODE_ENV === 'development' ? 'react-component-loader!' : '') + es6 + '!onus-loader!' + ast2template + '!jade2ast-loader'));

  /**
   * CSS
   */

  var styleLoader = load('style-loader');
  builder.addLoader(/\.(ess\?(dynamic|raw))$/, load('ess-loader!' + es6 + '!' + ast2template + '&pass-through=1!ess2ast-loader'));
  builder.addStyle('css', load('css-loader'));
  builder.addStyle(/\.(ess)$/, load('css-loader!autoprefixer-loader!ess-loader!' + es6 + '!' + ast2template + '&pass-through=1!ess2ast-loader'), styleLoader);

  /**
   * Fonts
   */

  builder.addLoader('woff', load('url-loader?limit=10000&mimetype=application/font-woff'));
  builder.addLoader('ttf', load('url-loader?limit=10000&mimetype=application/octet-stream'));
  builder.addLoader('eot', load('file-loader'));

  /**
   * Images
   */

  builder.addLoader('png', load('file-loader'));
  builder.addLoader('jpg', load('file-loader'));
  builder.addLoader('gif', load('file-loader'));
  builder.addLoader('svg', load('file-loader'));

  function load(str) {
    return str.split('!').map(function(loader) {
      var parts = loader.split('?');
      parts[0] = r.resolve(parts[0], 'warn');
      return parts.join('?');
    }).join('!');
  }
};