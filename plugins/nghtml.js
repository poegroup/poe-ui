/**
 * Module dependencies
 */

var nghtml = require('nghtml');
var jade = require('jade');

module.exports = function(builder) {
  var features = [];

  nghtml({
    webroot: 'public',
    extension: '.jade',
    confProp: 'angular-templates',
    hook: function (content, filename) {
      var opts = {
        filename: filename
      };
      var out = jade.compile(content, opts)();
      return out;
    }
  })(builder);
};
