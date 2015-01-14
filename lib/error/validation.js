var OrientormError = require('./base');

/**
 * Document Validation Error

 * @extends {OrientormError}
 */
function ValidationError () {
  OrientormError.call(this, "Validation failed");
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidationError';
  this.errors = {};
};

/**
 * @private
 */
ValidationError.prototype.__proto__ = OrientormError.prototype;

/**
 * console.log helper
 * @return {String}
 * @public
 */
ValidationError.prototype.toString = function () {
  var ret = this.name + ': ';
  var msgs = [];

  Object.keys(this.errors).forEach(function (key) {
    if (this == this.errors[key]) return;
    msgs.push(String(this.errors[key]));
  }, this)

  return ret + msgs.join(', ');
};

module.exports = ValidationError;
