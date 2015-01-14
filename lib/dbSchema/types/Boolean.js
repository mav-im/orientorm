var SchemaType = require('../SchemaType')
  , mixins = require('../mixins');

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 *
 * @constructor
 * @extends {SchemaType}
 */
function TypeBoolean (base, name, options) {
  SchemaType.call(this, base, name, options, 'Boolean');
};

/**
 * @private
 */
TypeBoolean.prototype.__proto__ = SchemaType.prototype;

/**
 * @param {*} value
 *
 * @return {Boolean|null}
 * @public
 */
TypeBoolean.prototype.cast = function (value) {
  if (null === value) return value;
  if ('0' === value) return false;
  if ('true' === value) return true;
  if ('false' === value) return false;
  return !! value;
};

/**
 * Check required field
 * @param {*} value
 *
 * @return {Boolean}
 * @protected
 */
TypeBoolean.prototype.checkRequired = function (value) {
  return value === true || value === false;
};

module.exports = TypeBoolean;