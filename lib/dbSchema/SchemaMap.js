var SchemaContainer = require('./SchemaContainer')
  , utils = require('../utils')
  , mixins = require('./mixins')
  , error = require('../error')
  , OrientMap = require('./wrappers').OrientMap
  , CastError = error.CastError;

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 * @param {String} type
 *
 * @constructor
 * @extends {SchemaContainer}
 */
function SchemaMap (base, name, options, type) {
  SchemaContainer.call(this, base, name, options, type);
  this.parsePaths(options);

  // wrap default value with OrientMap
  var defaultObj
    , fn;

  if (this.defaultValue) {
    defaultObj = this.defaultValue;
    fn = 'function' == typeof defaultObj;
  }

  this.default(function () {
    var obj = fn ? defaultObj() : defaultObj || {};
    return new OrientMap(obj, name, this);
  });
};

/**
 * @private
 */
SchemaMap.prototype.__proto__ = SchemaContainer.prototype;

/**
 * Built-in schema
 * @type {Schema}
 * @private
 */
SchemaMap.prototype._schema;

/**
 * @return {Schema}
 * @public
 */
SchemaMap.prototype.schema = function () {
  if (!this._schema) {
    this._schema = this.base.createVirtualClass();
  }
  return this._schema;
};

/**
 * Parse paths based on options
 * @param {Object} options
 *
 * @return {SchemaContainer}
 * @protected
 */
SchemaMap.prototype.parsePaths = function (options) {
  var paths = {};

  for (var i in options) {
    if (!options.hasOwnProperty(i) || i.substr(0, 1) === '$') continue;
    paths[i] = options[i];
  }
  return this.add(paths);
};

/**
 * @param {*} value
 *
 * @return {*}
 * @public
 */
SchemaMap.prototype.cast = function (value, path, doc, init, priorVal) {
  if (utils.isObject(value)) {
    if (!(value instanceof OrientMap)) {
      value = new OrientMap(value, path, doc);
    }

    var schema
      , self = this;

    path = path ? path + '.' : '';

    value.forEach(function (item, key) {
      schema = self.path(key, false);
      if (schema) {
        value[key] = schema.cast(item, path + key, value._parent || doc, init, priorVal, value);
      }
    }, this);

    return value;
  }
  else if (utils.isArray(value) && doc === 'remove') {
    return value.map(function (item) {
      if (utils.isString(item)) return item;
      throw new CastError(self.getType() + ' key', item, path);
    });
  }

  throw new CastError(this.getType(), value, path);
};

/**
 * Performs a validation of `value` using the validators declared for this Schema Property.
 * @param {*} map
 * @param {String} path
 * @param {Function} fn callback
 * @param {Object} scope
 *
 * @public
 */
SchemaMap.prototype.doValidate = function (map, path, fn, scope) {
  var self = this;

  SchemaContainer.prototype.doValidate.call(this, map, function (err) {
    if (err) return fn(err);

    var error;

    if (!map || !map.count()) return fn();

    map.forEach(function (item, i) {
      if (utils.isDocument(item)) {
        item.validate(function (err) {
          if (err && !error) {
            error = err;
          }
        }, path + '.' + i);
      }
      else {
        self.getEntry().doValidate(item, path + '.' + i, function (err) {
          if (err && !error) {
            error = err;
          }
        }, scope);
      }
    });

    return fn(error);

  }, scope);
};

/**
 * Check required field
 * @param {*} value
 *
 * @return {Boolean}
 * @protected
 */
SchemaMap.prototype.checkRequired = function (value) {
  return utils.isObject(value);
};

/**
 * Get class dependencies
 * @return {String[]}
 * @protected
 */
SchemaMap.prototype.dependencies = function () {
  if (this.options.linkedClass) return [this.options.linkedClass];
  return this.schema().dependencies();
};

/**
 * Apply function to all paths
 * @param {Function} fn
 * @param {String} [path]
 *
 * @return {SchemaMap}
 * @public
 */
SchemaMap.prototype.iterate = function (fn, path) {
  //var schema = this.schema();

  //if (schema.hasPaths()) {
  //  // iterate over all sub-paths
  //  schema.eachPath(fn, path);
  //}
  //else {
  //  // if we don't have sub-paths
  //  // apply to this item
  //  fn(path, this);
  //}
  fn(path, this);
  // @TODO: probably we should apply callback to item itself too
  return this;
};

/**
 * Build document tree
 * @return {*}
 * @public
 */
SchemaMap.prototype.buildTree = function () {
  var tree = {$map: true}
    , entryTree = this.getEntry().buildTree();

  utils.merge(tree, this.schema().buildTree());

  if (this.hasVirtualEntry()) return tree;

  Object.keys(tree).forEach(function (path) {
    tree[path] = entryTree;
  });

  return tree;
};

/**
 * Check whether entry doesn't matter
 * @return {Boolean}
 * @protected
 */
SchemaMap.prototype.hasVirtualEntry = function () {
  throw new Error ("Unsupported operation");
};

module.exports = SchemaMap;