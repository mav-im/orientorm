var SchemaList = require('../SchemaList')
  , SchemaType = require('../SchemaType')
  , mixins = require('../mixins')
  , utils = require('../../utils');

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 * @param {String} [mode]
 *
 * @constructor
 * @extends {SchemaList}
 */
function TypeEmbeddedList (base, name, options, mode) {
  mode = mode || 'list';
  SchemaList.call(this, base, name, options, 'EmbeddedList', mode);
};

/**
 * @private
 */
TypeEmbeddedList.prototype.__proto__ = SchemaList.prototype;

/**
 * Set linked type
 * @param {String|Object|SchemaType|null} linkedType
 *
 * @return {TypeEmbeddedList}
 * @public
 */
TypeEmbeddedList.prototype.type = function (linkedType) {
  if (linkedType === null || linkedType === undefined) {
    if (this.options.linkedType) {
      delete this.options.linkedType;
      this.entry = null;
    }
    return this;
  }

  this.entry = this.base.buildComponent(null, linkedType, true);
  this.options.linkedType = this.entry.getType();

  // clear linked class
  delete this.options.linkedClass;

  return this;
};

/**
 * Set linked class
 * @param {String|Schema|null} linkedClass
 *
 * @return {TypeEmbeddedList}
 * @public
 */
TypeEmbeddedList.prototype.class = function (linkedClass) {
  if (linkedClass === null || linkedClass === undefined) {
    if (this.options.linkedClass) {
      delete this.options.linkedClass;
      this.entry = null;
    }
    return this;
  }

  // if class schema is virtual
  // we have to add linked type Embedded with schema
  if (this.base.isClass(linkedClass) && linkedClass.isVirtual()) {
    return this.type({$class: linkedClass});
  }

  this.options.linkedClass = utils.isString(linkedClass) ? linkedClass : linkedClass.getName();
  this.entry = this.base.buildComponent(null, {$class: this.options.linkedClass}, true);

  // clear linked type
  delete this.options.linkedType;

  return this;
};

/**
 * Prepare options
 * @param {Object} options
 *
 * @return {TypeEmbeddedList}
 * @protected
 */
TypeEmbeddedList.prototype.parseOptions = function (options) {
  var entry
    , parsedOptions = {};

  if (utils.isArray(options)) {
    entry = options[0];
  }
  else {
    // options is object
    parsedOptions = utils.clone(options)
    if (options['$class']) {
      // embedded with class (will be interpretered as linked class)
      entry = {
        $class: options['$class']
      };
    }
    else if (options['$entry']) {
      entry = options['$entry'];
    }
    delete parsedOptions['$class'];
    delete parsedOptions['$entry'];
    delete parsedOptions['$type'];
  }

  // we need to add linked class
  if (entry && entry['$class']) {
    parsedOptions['$class'] = entry['$class'];
  }
  else {
    parsedOptions['$type'] = entry;
  }

  SchemaList.prototype.parseOptions.call(this, parsedOptions);
  return this;
};

/**
 * @return {SchemaType}
 * @public
 */
TypeEmbeddedList.prototype.getEntry = function () {
  if (!this.entry) {
    // in this case we don't have linked type or class
    this.entry = this.base.buildComponent(null, 'Any', true);
  }
  return this.entry;
};

/**
 * Get component
 * @param {String|Number} path
 * @param {Object|Boolean|SchemaType|Schema} [obj]
 * @param {Boolean} [strict]
 *
 * @return {SchemaType|undefined}
 * @public
 */
TypeEmbeddedList.prototype.path = function (path, obj, strict) {
  if (utils.isBoolean(obj)) {
    strict = obj;
    obj = undefined;
  }
  var entry = this.getEntry()
    , subpath;

  // get path
  if (obj == undefined) {
    // positional path here should start from number
    if (!/^\d+(\..+)?$/.test(path)) return undefined;

    if (utils.isNumber(path)) path = path.toString();
    subpath = path.split('.').slice(1).join('.');
    // if we have only position then return full entry
    if (!subpath) return entry;

    // othewise we should return subpath inside entry
    // set strict to true by default if not defined
    strict = strict !== false;
    return entry.path ? entry.path(subpath, obj, strict) : undefined;
  }

  // set path
  if (/^\d+(\..+)?$/.test(path)) {
    subpath = path.split(/\./).slice(1).join('.');
  }
  else {
    subpath = path;
  }

  // if not specified, we should replace entry
  if (!subpath) {
    if (this.base.isClass(obj)) {
      // entry based on linked class.
      // If schema is virtual, it will call type() method instead
      return this.class(obj);
    }
    else if (obj instanceof SchemaType) {
      return this.type(obj);
    }

    if (utils.isString(obj)) {
      // it is a Type
      return this.type(obj);
    }
    else if (utils.isObject(obj)) {
      if (obj['$class']) {
        return this.class(obj['$class']);
      }
      else {
        return this.type(obj);
      }
    }
  }

  if (!entry.path) {
    throw new TypeError('Type `' + entry.getType() + '` doesn\'t support nested items.');
  }

  entry.path(subpath, obj, strict);
  return this;
};

module.exports = TypeEmbeddedList;