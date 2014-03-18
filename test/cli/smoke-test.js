var page = require('webpage').create();
var system = require('system');

// freakin phantomjs
page.onInitialized = function() {
  page.evaluate(function() {
    if (!Function.prototype.bind) {
      Function.prototype.bind = function (oThis) {
        if (typeof this !== "function") {
          // closest thing possible to the ECMAScript 5 internal IsCallable function
          throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {},
            fBound = function () {
              return fToBind.apply(this instanceof fNOP && oThis
                                   ? this
                                   : oThis,
                                   aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
      };
    }
  });
};

var errors = [];

page.onConsoleMessage = function(msg, lineNum, sourceId) {
  if (~msg.match(/error/i)) errors.push(msg);
};

page.onError = function(msg, trace) {
  var msgStack = ['ERROR: ' + msg];
  if (trace && trace.length) {
    msgStack.push('TRACE:');
    trace.forEach(function(t) {
      msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
    });
  }
  var err = msgStack.join('\n');
  errors.push(err);
};

page.onResourceError = function(err) {
  errors.push(err.errorString);
};

page.onLoadFinished = function(status) {
  if (!errors.length) return phantom.exit(0);
  errors.forEach(function(err) {
    console.error(err);
  });
  phantom.exit(1);
};

var address = system.args[1];

page.open(address, function() {
  // phantom.exit();
});
