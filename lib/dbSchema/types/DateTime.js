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
function TypeDateTime (base, name, options) {
  SchemaType.call(this, base, name, options, 'DateTime');
};

/**
 * @private
 */
TypeDateTime.prototype.__proto__ = SchemaType.prototype;

/**
 * Set min value
 * @param {Number} min
 *
 * @return {TypeDateTime}
 * @public
 */
TypeDateTime.prototype.min = mixins.option('min');

/**
 * Set max value
 * @param {Number} max
 *
 * @return {TypeDateTime}
 * @public
 */
TypeDateTime.prototype.max = mixins.option('max');

/**
 * @param {*} value
 *
 * @return {Date}
 * @public
 */
TypeDateTime.prototype.cast = function (value, path) {
  if (value === null || value === '')
    return null;

  if (value instanceof Date)
    return value;

  var date;

  // support for timestamps
  if (utils.isNumber(value) || String(value) == Number(value))
    date = new Date(Number(value));

  // support for date strings
  else if (value.toString)
    date = new Date(value.toString());

  if (date.toString() != 'Invalid Date')
    return date;

  throw new CastError(this.getType(), value, path);
};

/**
 * Check required field
 * @param {*} value
 *
 * @return {Boolean}
 * @protected
 */
TypeDateTime.prototype.checkRequired = function (value) {
  return utils.isDate(value);
};

module.exports = TypeDateTime;