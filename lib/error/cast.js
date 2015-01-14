var OrientormError = require('./base');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @param {String} path
 * @extends {OrientormError}
 */
function CastError (type, value, path) {
  var message = 'Cast to `' + type + '` failed for value `' + value + '`';
  if (path) {
    message += ' at path `' + path + '`';
  }
  OrientormError.call(this, message);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'CastError';
  this.type = type;
  this.value = value;
  this.path = path;
};

/**
 * @private
 */
CastError.prototype.__proto__ = OrientormError.prototype;

module.exports = CastError;
