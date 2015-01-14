var OrientormError = require('./base')
  , errorMessages = require('./messages');

/**
 * Schema validator error
 *
 * @param {String} path
 * @param {String} msg
 * @param {String} type
 * @param {String|Number|any} val
 * @extends {OrientormError}
 */
function ValidatorError (path, msg, type, val) {
  if (!msg) msg = errorMessages.general.default;
  var message = this.formatMessage(msg, path, type, val);
  OrientormError.call(this, message);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorError';
  this.path = path;
  this.type = type;
  this.value = val;
};

/**
 * @private
 */
ValidatorError.prototype.__proto__ = OrientormError.prototype;

/**
 * toString helper
 */
ValidatorError.prototype.toString = function () {
  return this.message;
};

module.exports = ValidatorError;