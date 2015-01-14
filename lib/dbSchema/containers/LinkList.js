var SchemaList = require('../SchemaList')
  , SchemaType = require('../SchemaType')
  , TypeLink = require('../types/Link')
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
function TypeLinkList (base, name, options, mode) {
  mode = mode || 'list';
  SchemaList.call(this, base, name, options, 'LinkList', mode);
};

/**
 * @private
 */
TypeLinkList.prototype.__proto__ = SchemaList.prototype;

/**
 * Prepare options
 * @param {Object} options
 *
 * @return {TypeLinkList}
 * @protected
 */
TypeLinkList.prototype.parseOptions = function (options) {
  var entry
    , parsedOptions = {};

  if (utils.isArray(options)) {
    entry = options[0] || {};
    if (entry['$class']) {
      parsedOptions['$class'] = entry['$class'];
    }
  }
  else {
    utils.mergeObjects(parsedOptions, options);
  }
  delete parsedOptions['$type'];

  parsedOptions['$class'] = parsedOptions['$class'] || null;

  SchemaList.prototype.parseOptions.call(this, parsedOptions);
  return this;
};

/**
 * Add component or components
 * @param {String|Object} name
 * @param {SchemaType|Object} [obj] Prepared component or options
 *
 * @return {TypeLinkList}
 * @public
 */
TypeLinkList.prototype.add = function (name, obj) {
  // Nothing to add here
  return this;
};

/**
 * Get/Set path with type
 * @param {String|Number} path
 * @param {Object|Boolean|String|TypeLink} [obj]
 * @param {Boolean} [strict]
 *
 * @return {SchemaType|undefined}
 * @public
 */
TypeLinkList.prototype.path = function (path, obj, strict) {
  if (utils.isBoolean(obj)) {
    strict = obj;
    obj = undefined;
  }
  var entry = this.getEntry();

  // get path
  if (obj == undefined) {
    // positional path here must be number
    if (!/^\d+$/.test(path)) return undefined;
    return entry;
  }

  // set path
  if (path && !/^\d+$/.test(path)) {
    throw new TypeError('Type LinkList supports only positional paths with Links.');
  }

  if (obj instanceof SchemaType) {
    if (obj instanceof TypeLink) {
      return this.class(obj.getEntry());
    }
    else {
      throw new TypeError('LinkList can contain only Links but got type `' + obj.getType() + '`.');
    }
  }
  else if (utils.isString(obj)) {
    return this.class(obj);
  }
  else if (utils.isObject(obj)) {
    return this.class(obj['$class']);
  }
  throw new TypeError('Unsupported Link description for LinkList');
};

/**
 * Set linked class
 * @param {String|Schema|null} linkedClass
 *
 * @return {TypeLinkList}
 * @public
 */
TypeLinkList.prototype.class = function (linkedClass) {
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

module.exports = TypeLinkList;