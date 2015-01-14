var SchemaType = require('../SchemaType')
  , mixins = require('../mixins')
  , utils = require('../../utils')
  , error = require('../../error')
  , CastError = error.CastError;

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 *
 * @constructor
 * @extends {SchemaType}
 */
function TypeShort (base, name, options) {
  SchemaType.call(this, base, name, options, 'Short');
};

/**
 * @private
 */
TypeShort.prototype.__proto__ = SchemaType.prototype;

/**
 * Set min value
 * @param {Number} value
 * @param {String} [message] custom error message
 *
 * @return {TypeShort}
 * @public
 */
TypeShort.prototype.min = mixins.minValidator();

/**
 * Set max value
 * @param {Number} value
 * @param {String} [message] custom error message
 *
 * @return {TypeShort}
 * @public
 */
TypeShort.prototype.max = mixins.maxValidator();

/**
 * @param {*} value
 *
 * @return {Number}
 * @public
 */
TypeShort.prototype.cast = function (value, path) {
  if (!isNaN(value)) {
    if (null === value || '' === value || typeof value === 'undefined') return null;
    if (utils.isString(value)) value = Number(value);
    else if (value.toString && !utils.isArray(value) && value.toString() == Number(value)) {
      value = Number(value);
    }

    if (utils.isNumber(value)) {
      return Math.floor(value);
    }
  }

  throw new CastError(this.getType(), value, path);
};

/**
 * Check required field
 * @param {*} value
 *
 * @return {Boolean}
 * @protected
 */
TypeShort.prototype.checkRequired = function (value) {
  return utils.isNumber(value);
};

module.exports = TypeShort;