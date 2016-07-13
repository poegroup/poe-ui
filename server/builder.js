/**
 * Module dependencies
 */

var fs = require('fs');
var exists = fs.existsSync;

module.exports = function(r, app, opts, NODE_ENV) {
  var Builder = r('poe-ui-builder');
  var webpack = r('webpack');
  if (!Builder) return;
  var entry = opts.entry;
  var builderOpts = opts.builder || {};
  var builder = app.builder = Builder(entry, webpack);

  var babel = r('babel-loader/package.json').version.split('.')[0];

  var es6 = babel == '5' ?
    load('babel-loader?optional=runtime&modules=commonStrict&cacheDirectory=' + (opts.assetCache || '/tmp')) :
    load('babel-loader?presets[]=es2015&plugins[]=transform-runtime&cacheDirectory=' + (opts.assetCache || '/tmp'));

  var ast2template = load('ast2template-loader?root=' + r.resolve(entry + '/root.js', 'silent'));

  /**
   * JS
   */

  builder.addES6 = function(config) {
    config.loader = es6;
    builder.module.loaders.push(config);
  };
  builder.addES6.loader = es6;

  builder.addES6({
    test: /\.(js)$/,
    exclude: /node_modules/
  });

  builder.addES6({
    test: /\.(js)$/,
    include: /node_modules\/[^\/]+\/blocks/,
  });

  builder.resolve.extensions.push('.json');
  builder.addLoader('json', load('json-loader'));

  /**
   * Markup
   */

  if (builderOpts.jade !== false) {
    builder.resolve.extensions.push('.jade');
    builder.addLoader('jade', load(es6 + '!onus-loader!' + ast2template + '!jade2ast-loader'));
  }

  /**
   * CSS
   */

  if (builderOpts.styles !== false) {
    var styleLoader = load('style-loader');
    builder.addLoader(/\.(ess\?(dynamic|raw))$/, load('ess-loader!' + es6 + '!' + ast2template + '&keyName=false&pass-through=1!ess2ast-loader?urlRequire=1'));
    builder.addStyle('css', load('css-loader?-minimize'));
    var essLoaderOpts = NODE_ENV === 'development' ? '?postcss=autoprefixer' : '';
    builder.addStyle(/\.(ess)$/, load('ess-loader' + essLoaderOpts + '!' + es6 + '!' + ast2template + '&keyName=false&pass-through=1&native-path=1!ess2ast-loader?urlRequire=1'), styleLoader);
  }

  /**
   * Fonts
   */

  builder.addLoader('woff', load('url-loader?limit=10000&mimetype=application/font-woff'));
  builder.addLoader('ttf', load('url-loader?limit=10000&mimetype=application/octet-stream'));
  builder.addLoader('eot', load('file-loader'));

  /**
   * Images
   */

  builder.addImage = function(ext, opts) {
    opts = opts || {};
    opts.optimizationLevel = opts.optimizationLevel || parseInt(process.env.PNG_OPTIMIZATION_LEVEL, 10) || 2;
    var str = NODE_ENV === 'development' || !r.resolve('image-webpack-loader', 'silent') ?
      'file-loader' :
      'file-loader!image-webpack-loader?' + JSON.stringify(opts);
    builder.addLoader(ext, str);
  };

  builder.addImage('png', {pngquant: {speed: 10, quality: '80'}});
  builder.addImage('jpg', {progressive: true});
  builder.addImage('jpeg', {progressive: true});
  builder.addImage('gif');
  builder.addImage('svg');
  builder.addImage('ico');

  function load(str) {
    return str.split('!').map(function(loader) {
      var parts = loader.split('?');
      parts[0] = r.resolve(parts[0], 'warn');
      return parts.join('?');
    }).join('!');
  }
};
