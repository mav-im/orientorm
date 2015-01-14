var SchemaType = require('./SchemaType')
  , utils = require('../utils')
  , mixins = require('./mixins');

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 * @param {String} type
 *
 * @constructor
 * @extends {SchemaType}
 */
function SchemaContainer (base, name, options, type) {
  SchemaType.call(this, base, name, options, type);
};

/**
 * @private
 */
SchemaContainer.prototype.__proto__ = SchemaType.prototype;

/**
 * @type {SchemaType}
 * @protected
 */
SchemaContainer.prototype.entry;

/**
 * @param {String|Schema} linkedClass
 *
 * @return {SchemaContainer}
 * @public
 * @abstract
 */
SchemaContainer.prototype.class = function (linkedClass) {
  throw new Error ('Unsupported operation');
};

/**
 * @return {SchemaType}
 * @public
 */
SchemaContainer.prototype.getEntry = function () {
  return this.entry;
};

/**
 * @return {Boolean}
 * @protected
 */
SchemaContainer.prototype.hasEntry = function () {
  return !!this.getEntry();
};

/**
 * Add component or components
 * @param {String|Object} name
 * @param {SchemaType|Object} [obj] Prepared component or options
 *
 * @return {SchemaContainer}
 * @public
 */
SchemaContainer.prototype.add = function (name, obj) {
  if (!name) return this;
  var self = this
    , paths = {};

  if (utils.isObject(name)) {
    paths = name;
  }
  else {
    paths[name] = obj;
  }

  Object.keys(paths).forEach(function(path) {
    self.path(path, paths[path]);
  });
  return this;
};

/**
 * Get component
 * @param {String|Number} path
 * @param {Object|Boolean} [obj]
 * @param {Boolean} [strict]
 *
 * @return {SchemaType|undefined}
 * @public
 * @abstract
 */
SchemaContainer.prototype.path = function (path, obj, strict) {
  throw new Error('Unsupported operation');
};

/**
 * Get class dependencies
 * @return {String[]}
 * @protected
 */
SchemaContainer.prototype.dependencies = function () {
  return this.options.linkedClass ? [this.options.linkedClass] : [];
};

module.exports = SchemaContainer;