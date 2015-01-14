var SchemaType = require('../SchemaType')
  , mixins = require('../mixins')
  , RecordId = require('../../RecordId')
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
function TypeLink (base, name, options) {
  this.entry = null;
  SchemaType.call(this, base, name, options, 'Link');
};

/**
 * @private
 */
TypeLink.prototype.__proto__ = SchemaType.prototype;

/**
 * @type {Schema}
 * @protected
 */
TypeLink.prototype.entry;

/**
 * @param {String|Schema} linkedClass
 * @public
 */
TypeLink.prototype.class = function (linkedClass) {
  if (linkedClass === null || linkedClass === undefined) {
    if (this.options.linkedClass) {
      delete this.options.linkedClass;
      this.entry = null;
    }
    return this;
  }

  this.options.linkedClass = utils.isString(linkedClass) ? linkedClass : linkedClass.getName();
  this.entry = null;
  return this;
};

/**
 * @return {Schema}
 * @public
 */
TypeLink.prototype.getEntry = function () {
  if (!this.entry) {
    this.entry = this.options.linkedClass
      ? this.base.getClass(this.options.linkedClass)
      : this.base.createVirtualClass();
  }
  return this.entry;
};

/**
 * @return {Boolean}
 * @protected
 */
TypeLink.prototype.hasEntry = function () {
  return !!this.getEntry();
};

/**
 * @param {*} value
 *
 * @return {String}
 * @public
 */
TypeLink.prototype.cast = function (value, path) {
  if (null === value) return value;

  var rid = new RecordId(value);

  // we have entry always (real class or virtual)
  if (rid.isValid() && this.getEntry().hasRid(rid)) {
    return rid.toString();
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
TypeLink.prototype.checkRequired = function (value) {
  return utils.isString(value) && value.length;
};

/**
 * Get class dependencies
 * @return {String[]}
 * @protected
 */
TypeLink.prototype.dependencies = function () {
  return this.options.linkedClass ? [this.options.linkedClass] : [];
};

module.exports = TypeLink;