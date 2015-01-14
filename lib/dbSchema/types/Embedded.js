var SchemaType = require('../SchemaType')
  , mixins = require('../mixins')
  , utils = require('../../utils')
  , Subdocument = require('../../model/EmbeddedDocument')
  , CastError = require('../../error').CastError;

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 *
 * @constructor
 * @extends {SchemaType}
 */
function TypeEmbedded (base, name, options) {
  SchemaType.call(this, base, name, options, 'Embedded');
  this.parsePaths(options);

  // wrap default value with Embedded document
  var self = this
    , defaultV
    , fn;

  if (this.defaultValue) {
    defaultV = this.defaultValue;
    fn = 'function' == typeof defaultV;
  }

  this.default(function (scope) {
    return fn ? defaultV(scope) : defaultV || {};
  });
};

/**
 * @private
 */
TypeEmbedded.prototype.__proto__ = SchemaType.prototype;

/**
 * Built-in schema of embedded document
 * @type {Schema}
 * @private
 */
TypeEmbedded.prototype._schema;

/**
 * @type {Function}
 * @protected
 */
TypeEmbedded.prototype._casterConstructor;

/**
 * @param {String|Schema|null} linkedClass
 * @public
 */
TypeEmbedded.prototype.class = function (linkedClass) {
  if (linkedClass === null || linkedClass === undefined) {
    if (this.options.linkedClass) {
      delete this.options.linkedClass;
      this._schema = null;
      this._casterConstructor = null;
    }
    return this;
  }

  this.options.linkedClass = utils.isString(linkedClass) ? linkedClass : linkedClass.getName();
  // we have virtual schema
  if (!this.options.linkedClass && linkedClass) {
    delete this.options.linkedClass;
    this._schema = linkedClass;
  }
  else {
    // will be filled in schema() method
    this._schema = null;
  }

  this._casterConstructor = null;

  return this;
};

/**
 * @return {Schema}
 * @public
 */
TypeEmbedded.prototype.schema = function () {
  if (!this._schema) {
    this._schema = this.options.linkedClass
      ? this.base.getClass(this.options.linkedClass)
      : this.base.createVirtualClass();
  }
  return this._schema;
};

/**
 * Parse paths based on options
 * @param {Object} options
 *
 * @return {TypeEmbedded}
 * @protected
 */
TypeEmbedded.prototype.parsePaths = function (options) {
  if (options['$class']) return this;

  var paths = {};
  for (var i in options) {
    if (!options.hasOwnProperty(i) || i.substr(0, 1) === '$') continue;
    paths[i] = options[i];
  }

  // add schema based on virtual class schema
  return this.add(paths);
};

/**
 * @param {*} value
 *
 * @return {*}
 * @public
 */
TypeEmbedded.prototype.cast = function (value, path, doc, init, prev, container) {
  if (utils.isObject(value)) {
    var casterConstructor = this.casterConstructor();

    if (!(value instanceof casterConstructor)) {
      if (init) {
        var embed = new casterConstructor(undefined, container, doc, this.getName());
        return embed.init(value);
      }
      else {
        return new casterConstructor(value, container, doc, this.getName());
      }
    }
    else if (!value._parent) {
      if (container) {
        // value may have been created using container.create()
        value._parent = container._parent;
        value._parentContainer = container;
      }
      else {
        value._parent = doc;
      }
    }

    return value;
  }

  throw new CastError(this.getType(), value, path);
};

/**
 * Scopes paths selected in a query to this array.
 * Necessary for proper default application of subdocument values.
 *
 * @param {String} path - subdoc initial path
 * @param {Object|undefined} fields - the root fields selected in the query
 * @param {Boolean|undefined} init - if we are being created part of a query result
 */
function scopePaths (path, fields, init) {
  if (!(init && fields)) return undefined;

  var keys = Object.keys(fields)
    , i = keys.length
    , selected = {}
    , hasKeys
    , key;

  path = path + '.';

  while (i--) {
    key = keys[i];
    if (0 === key.indexOf(path)) {
      hasKeys || (hasKeys = true);
      selected[key.substring(path.length)] = fields[key];
    }
  }

  return hasKeys && selected || undefined;
}

/**
 * Add component or components
 * @param {String|Object} name
 * @param {SchemaType|Object} [obj] Prepared component or options
 *
 * @return {TypeEmbedded}
 * @public
 */
TypeEmbedded.prototype.add = function (name, obj) {
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
 * @param {String} path
 * @param {Object|Boolean} [obj]
 * @param {Boolean} [strict]
 *
 * @return {SchemaType|undefined}
 * @public
 */
TypeEmbedded.prototype.path = function (path, obj, strict) {
  // get
  if (obj == undefined || utils.isBoolean(obj)) {
    return this.schema().path(path, obj, strict);
  }
  //set
  this.schema().path(path, obj, strict);
  return this;
};

/**
 * Check required field
 * @param {*} value
 *
 * @return {Boolean}
 * @protected
 */
TypeEmbedded.prototype.checkRequired = function (value) {
  return utils.isObject(value);
};

/**
 * Get class dependencies
 * @return {String[]}
 * @protected
 */
TypeEmbedded.prototype.dependencies = function () {
  return this.options.linkedClass ? [this.options.linkedClass] : [];
};

/**
 * Get default value
 * @return {*}
 * @public
 */
TypeEmbedded.prototype.getDefault = function (scope, init, path) {
  var def = SchemaType.prototype.getDefault.call(this, scope, init, path);

  var doc = utils.clone(def._doc);
  delete doc['@type'];
  delete doc['@class'];

  return (utils.isEmpty(doc)) ? undefined : def;
};

/**
 * Apply function to all paths
 * @param {Function} fn
 * @param {String} [path]
 *
 * @return {TypeEmbedded}
 * @public
 */
TypeEmbedded.prototype.iterate = function (fn, path) {
  //var schema = this.schema();

  //if (schema.hasPaths()) {
  //  // apply to each sub-path
  //  schema.eachPath(fn, path);
  //}
  //else {
  //  // we should apply to this element if it has no sub-paths
  //  fn(path, this);
  //}

  fn(path, this);

  // @TODO: probably we should apply callback to item itself too
  //fn(path, this);
  //schema.eachPath(fn, path);
  return this;
};

/**
 * Build document tree
 * @return {*}
 * @public
 */
TypeEmbedded.prototype.buildTree = function () {
  return this.schema().buildTree();
};

/**
 * Get caster constructor
 * @public
 */
TypeEmbedded.prototype.casterConstructor = function () {
  if (!this._casterConstructor) {
    var schema = this.schema();

    // compile an embedded document for this schema
    function EmbeddedDocument () {
      Subdocument.apply(this, arguments);
    }

    EmbeddedDocument.prototype.__proto__ = Subdocument.prototype;
    EmbeddedDocument.prototype.$__setSchema(schema);
    EmbeddedDocument.schema = schema;

    // apply methods
    for (var i in schema.methods) {
      EmbeddedDocument.prototype[i] = schema.methods[i];
    }

    // apply statics
    for (var i in schema.statics)
      EmbeddedDocument[i] = schema.statics[i];

    //EmbeddedDocument.options = options;

    this._casterConstructor = EmbeddedDocument;
  }
  return this._casterConstructor;
};

module.exports = TypeEmbedded;