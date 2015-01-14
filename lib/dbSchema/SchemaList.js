var SchemaContainer = require('./SchemaContainer')
  , SchemaType = require('./SchemaType')
  , utils = require('../utils')
  , mixins = require('./mixins')
  , OrientArray = require('./wrappers').OrientArray
  , CastError = require('../error').CastError;

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 * @param {String} type
 * @param {String} mode (list|set)
 *
 * @constructor
 * @extends {SchemaContainer}
 */
function SchemaList (base, name, options, type, mode) {
  SchemaContainer.call(this, base, name, options, type);

  // store mode
  this._mode = mode;

  // wrap default value with OrientArray
  var defaultArr
    , fn;

  if (this.defaultValue) {
    defaultArr = this.defaultValue;
    fn = 'function' == typeof defaultArr;
  }

  this.default(function () {
    var arr = fn ? defaultArr() : defaultArr || [];
    return new OrientArray(arr, name, this, mode);
  });
};

/**
 * @private
 */
SchemaList.prototype.__proto__ = SchemaContainer.prototype;

/**
 * @type {String}
 */
SchemaList.prototype._mode;

/**
 * Check required field
 * @param {*} value
 *
 * @return {Boolean}
 * @protected
 */
SchemaList.prototype.checkRequired = function (value) {
  return !!(value && value.length);
};

/**
 * Apply function to all paths
 * @param {Function} fn
 * @param {String} [path]
 *
 * @return {SchemaList}
 * @public
 */
SchemaList.prototype.iterate = function (fn, path) {
  //// if we don't have real entry
  //// apply to this item
  //if (!this.options.linkedClass && !this.options.linkedType) {
  //  fn(path, this);
  //}
  //else {
  //  this.getEntry().iterate(fn, path + '.0');
  //}

  fn(path, this);
  return this;
};

/**
 * @param {*} value
 *
 * @return {[]|null}
 * @public
 */
SchemaList.prototype.cast = function (value, path, doc, init, priorVal) {
  if (!utils.isArray(value)) return this.cast([value], path, doc, init, priorVal);

  if (!(value instanceof OrientArray)) {
    value = new OrientArray(value, path, doc, this._mode);
  }

  var prefix = path ? path + '.' : '';
  for (var i = 0, l = value.length; i < l; i++) {
    value[i] = this.getEntry().cast(value[i], prefix + i, value._parent || doc, init, priorVal, value);
  }

  return value;
};

/**
 * Performs a validation of `value` using the validators declared for this Schema Property.
 * @param {*} array
 * @param {String} path
 * @param {Function} fn callback
 * @param {Object} scope
 *
 * @public
 */
SchemaList.prototype.doValidate = function (array, path, fn, scope) {
  var self = this;

  SchemaType.prototype.doValidate.call(this, array, path, function (err) {
    if (err) return fn(err);

    var error;

    if (!array || !array.length) return fn();

    array.forEach(function (item, i) {
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
 * Build document tree
 * @return {*}
 * @public
 */
SchemaList.prototype.buildTree = function () {
  return [this.getEntry().buildTree()];
};

/**
 * @type {Object}
 * @protected
 */
SchemaList.prototype.$conditionalHandlers = function () {
  return {
    $eq   : utils.handleArray,
    $ne   : utils.handleArray,

    $is   : utils.handleSingle,
    $isnt : utils.handleSingle,

    $in   : utils.handleArray,
    $nin  : utils.handleArray
  };
};

module.exports = SchemaList;