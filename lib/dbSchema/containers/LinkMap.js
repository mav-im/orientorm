var SchemaMap = require('../SchemaMap')
  , SchemaType = require('../SchemaType')
  , TypeLink = require('../types/Link')
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
function TypeLinkMap (base, name, options) {
  SchemaMap.call(this, base, name, options, 'LinkMap');
};

/**
 * @private
 */
TypeLinkMap.prototype.__proto__ = SchemaMap.prototype;

/**
 * Prepare options
 * @param {Object} options
 *
 * @return {TypeLinkMap}
 * @protected
 */
TypeLinkMap.prototype.parseOptions = function (options) {
  var parsedOptions = {};

  utils.mergeObjects(parsedOptions, options);

  delete parsedOptions['$type'];
  parsedOptions['$class'] = parsedOptions['$class'] || null;

  SchemaMap.prototype.parseOptions.call(this, parsedOptions);
  return this;
};

/**
 * Get/Set path with type
 * @param {String} path
 * @param {Object|Boolean|SchemaType} [obj]
 * @param {Boolean} [strict]
 *
 * @return {SchemaType|null}
 * @public
 */
TypeLinkMap.prototype.path = function (path, obj, strict) {
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
      // if global link entry has virtual class
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
  if (/\./.test(path)) {
    throw new TypeError('LinkMap can contain only Links but got path `' + path + '` with sub-paths.');
  }

  var options = {};
  if (utils.isString(obj)) {
    options = {
      $link: true,
      $class: obj
    }
  }
  else if (obj instanceof SchemaType) {
    if (obj instanceof TypeLink) {
      options = obj;
    }
    else {
      throw new TypeError('LinkMap can contain only Links but got type `' + obj.getType() + '` for path `' + path + '`.');
    }
  }
  else if (utils.isObject(obj)) {
    options = utils.clone(obj);
    options['$link'] = true;
    delete options['$type'];
  }
  else {
    throw new TypeError('LinkMap can contain only Links. Check your schema for type `' + options + '`.');
  }


  schema.path(path, options, strict);
  return this;
};

/**
 * Set linked class
 * @param {String|Schema|null} linkedClass
 *
 * @return {TypeLinkMap}
 * @public
 */
TypeLinkMap.prototype.class = function (linkedClass) {
  if (linkedClass === null || linkedClass === undefined) {
    if (this.options.linkedClass)
      delete this.options.linkedClass;
  }
  else {
    this.options.linkedClass = utils.isString(linkedClass) ? linkedClass : linkedClass.getName();
  }

  this.entry = this.base.buildComponent(null, {
    $link: true,
    $class: linkedClass
  }, true);

  return this;
};

/**
 * Check whether entry doesn't matter
 * @return {Boolean}
 * @protected
 */
TypeLinkMap.prototype.hasVirtualEntry = function () {
  return this.getEntry().getEntry().isVirtual();
};

module.exports = TypeLinkMap;