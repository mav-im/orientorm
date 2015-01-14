var SchemaMap = require('../SchemaMap')
  , mixins = require('../mixins')
  , utils = require('../../utils');

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 *
 * @constructor
 * @extends {SchemaMap}
 */
function TypeEmbeddedMap (base, name, options) {
  SchemaMap.call(this, base, name, options, 'EmbeddedMap');
};

/**
 * @private
 */
TypeEmbeddedMap.prototype.__proto__ = SchemaMap.prototype;

/**
 * Prepare options
 * @param {Object} options
 *
 * @return {TypeEmbeddedMap}
 * @protected
 */
TypeEmbeddedMap.prototype.parseOptions = function (options) {
  var entry = null
    , parsedOptions = {};

  utils.mergeObjects(parsedOptions, options);

  if (parsedOptions['$class']) {
    entry = {
      $class: parsedOptions['$class']
    };
  }
  else if (options['$entry']) {
    entry = options['$entry'];
  }

  delete parsedOptions['$class'];
  delete parsedOptions['$type'];
  delete parsedOptions['$map'];
  delete parsedOptions['$entry'];

  if (entry && entry['$class']) {
    parsedOptions['$class'] = entry['$class'];
  }
  else {
    parsedOptions['$type'] = entry;
  }

  SchemaMap.prototype.parseOptions.call(this, parsedOptions);
  return this;
};

/**
 * Set linked class
 * @param {String|Schema|null} linkedClass
 *
 * @return {TypeEmbeddedMap}
 * @public
 */
TypeEmbeddedMap.prototype.class = function (linkedClass) {
  if (linkedClass === null || linkedClass === undefined) {
    if (this.options.linkedClass) {
      delete this.options.linkedClass;
      this.entry = null;
    }
    return this;
  }

  this.options.linkedClass = utils.isString(linkedClass) ? linkedClass : linkedClass.getName();
  this.entry = this.base.buildComponent(null, {$class: this.options.linkedClass}, true);

  // clear linked type
  delete this.options.linkedType;

  return this;
};

/**
 * Set linked type
 * @param {String|Object|null} linkedType
 *
 * @return {TypeEmbeddedMap}
 * @public
 */
TypeEmbeddedMap.prototype.type = function (linkedType) {
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
 * Get component
 * @param {String} path
 * @param {Object|Boolean} [obj]
 * @param {Boolean} [strict] true by default
 *
 * @return {SchemaType|undefined}
 * @public
 */
TypeEmbeddedMap.prototype.path = function (path, obj, strict) {
  if (utils.isBoolean(obj)) {
    strict = obj;
    obj = undefined;
  }
  var entry = this.getEntry()
    , schema = this.schema();

  // get path
  if (obj == undefined) {
    var field = schema.path(path, strict);
    if (this.hasVirtualEntry()) {
      // if global linked entry is Any
      // we will use local type for path based on strict option
      return field;
    }
    var name = path.split(/\./).pop();
    // othewise if field specified we should return global linked type
    if (field) return entry.name(name);

    // set strict to true by default if not defined
    strict = strict !== false;
    // if there is no registered field with path we should look at strict option
    return strict ? undefined : entry.name(name);
  }

  // set path
  schema.path(path, obj, strict);
  return this;
};

/**
 * @return {SchemaType}
 * @public
 */
TypeEmbeddedMap.prototype.getEntry = function () {
  if (!this.entry) {
    this.entry = this.base.buildComponent(null, 'Any', true);
  }
  return this.entry;
};

/**
 * Check whether entry doesn't matter
 * @return {Boolean}
 * @protected
 */
TypeEmbeddedMap.prototype.hasVirtualEntry = function () {
  return (this.getEntry().getType() === 'Any');
};

module.exports = TypeEmbeddedMap;