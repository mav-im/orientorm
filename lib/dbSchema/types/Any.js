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
function TypeAny (base, name, options) {
  SchemaType.call(this, base, name, options, 'Any');
};

/**
 * @private
 */
TypeAny.prototype.__proto__ = SchemaType.prototype;

/**
 * @param {*} value
 *
 * @return {Boolean|null}
 * @public
 */
TypeAny.prototype.cast = function (value, path) {
  return value;
};

/**
 * Check required field
 * @param {*} value
 *
 * @return {Boolean}
 * @protected
 */
TypeAny.prototype.checkRequired = function (value) {
  return (value !== undefined) && (value !== null);
};

module.exports = TypeAny;