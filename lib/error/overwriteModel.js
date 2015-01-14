var OrientormError = require('./base');

/**
 * OverwriteModel Error constructor.
 * @extends {OrientormError}
 */
function OverwriteModelError (name) {
  OrientormError.call(this, 'Cannot overwrite `' + name + '` model once compiled.');
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'OverwriteModelError';
};

/**
 * @private
 */
OverwriteModelError.prototype.__proto__ = OrientormError.prototype;

module.exports = OverwriteModelError;