/**
 * Module dependencies
 */

var nghtml = require('nghtml');
var jade = require('jade');
var extname = require('path').extname;

module.exports = function(builder) {
  var features = [];

  nghtml({
    webroot: 'public',
    extension: ['.jade', '.html'],
    confProp: 'angular-templates',
    hook: function (content, filename) {
      if (extname(filename) !== '.jade') return content;
      var opts = {
        filename: filename
      };
      var out = jade.compile(content, opts)();
      return out;
    }
  })(builder);
};
