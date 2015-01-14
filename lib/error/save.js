var OrientormError = require('./base');

/**
 * Document Save Error

 * @extends {OrientormError}
 */
function SaveError () {
  OrientormError.call(this, "Save failed");
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'SaveError';
  this.errors = {};
};

/**
 * @private
 */
SaveError.prototype.__proto__ = OrientormError.prototype;

/**
 * console.log helper
 * @return {String}
 * @public
 */
SaveError.prototype.toString = function () {
  var ret = this.name + ': ';
  var msgs = [];

  Object.keys(this.errors).forEach(function (key) {
    if (this == this.errors[key]) return;
    msgs.push(String(this.errors[key]));
  }, this)

  return ret + msgs.join(', ');
};

module.exports = SaveError;
