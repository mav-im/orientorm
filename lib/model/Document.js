var EventEmitter = require('events').EventEmitter
  , Schema = require('../dbSchema/Schema')
  , setMaxListeners = EventEmitter.prototype.setMaxListeners
  , utils = require('../utils')
  , inspect = require('util').inspect
  , InternalCache = require('./InternalCache')
  , ValidationError = require('../error').ValidationError
  , ValidatorError = require('../error').ValidatorError
  , SaveError = require('../error').SaveError
  , TypeAny
  , hooks = require('hooks')
  , Promise = require('bluebird');

/**
 * Document constructor
 * @param {Object} obj
 * @param {Object|Boolean} [fields] Selected fields or strict mode
 * @param {Boolean} [skipId]
 *
 * @extends {EventEmitter}
 * @constructor
 */
function Doc (obj, fields, skipId) {
  this.$__ = new InternalCache;
  this.isNew = true;
  this.errors = undefined;

  var schema = this.schema;

  if (utils.isBoolean(fields)) {
    this.$__.strictMode = fields;
    fields = undefined;
  }
  else {
    this.$__.strictMode = schema.builtOpts && schema.builtOpts.strict;
    this.$__.selected = fields;
  }

  // register required paths
  var required = schema.requiredPaths();
  for (var i = 0; i < required.length; ++i) {
    this.$__.activePaths.require(required[i]);
  }

  setMaxListeners.call(this, 0);
  this._doc = this.$__buildDoc(obj, fields, skipId);

  if (obj) {
    this.set(obj, undefined, true);
  }

  this.$__registerHooks();
};

/**
 * @private
 */
Doc.prototype.__proto__ = EventEmitter.prototype;

/**
 * The document schema
 * @type {Schema}
 * @public
 */
Doc.prototype.schema;

/**
 * Boolean flag specifying if the document is new
 * @type {Boolean}
 * @public
 */
Doc.prototype.isNew;

/**
 * Hash containing current validation errors.
 * @type {Object}
 * @public
 */
Doc.prototype.errors;

/*!
 * Set up middleware support
 */
for (var k in hooks) {
  Doc.prototype[k] = Doc[k] = hooks[k];
}

/**
 * Assigns/compiles `schema` into this documents prototype.
 *
 * @param {Schema} schema
 * @protected
 */
Doc.prototype.$__setSchema = function (schema) {
  compile(schema.buildTree(), this);
  this.schema = schema;
};

/**
 * @param {Object} tree
 * @param {Object} proto
 * @param {String} [prefix]
 */
function compile (tree, proto, prefix) {
  var keys = Object.keys(tree)
    , i = keys.length
    , limb
    , key;

  while (i--) {
    key = keys[i];
    limb = tree[key];

    define(key
      , (('Object' === limb.constructor.name && Object.keys(limb).length && !limb.$map)
        ? limb
        : null)
      , proto
      , prefix
      , keys);
  }
};

/**
 * Defines the accessor named prop on the incoming prototype.
 */
function define (prop, subprops, prototype, prefix, keys) {
  prefix = prefix || ''
  var path = (prefix ? prefix + '.' : '') + prop;

  if (subprops) {
    Object.defineProperty(prototype, prop, {
      enumerable: true,
      get: function () {
        if (!this.$__.getters)
          this.$__.getters = {};

        if (!this.$__.getters[path]) {
          var nested = Object.create(this);

          // save scope for nested getters/setters
          if (!prefix) nested.$__.scope = this;

          // shadow inherited getters from sub-objects so
          // thing.nested.nested.nested... doesn't occur (gh-366)
          var len = keys.length;

          for (var i = 0; i < len; ++i) {
            // over-write the parents getter without triggering it
            Object.defineProperty(nested, keys[i], {
              enumerable: false   // It doesn't show up.
              , writable: true      // We can set it later.
              , configurable: true  // We can Object.defineProperty again.
              , value: undefined    // It shadows its parent.
            });
          }

          nested.toObject = function () {
            return this.get(path);
          };

          compile(subprops, nested, path);
          this.$__.getters[path] = nested;
        }

        return this.$__.getters[path];
      },
      set: function (v) {
        if (v instanceof Doc) v = v.toObject();
        return (this.$__.scope || this).set(path, v);
      }
    });
  }
  else {
    Object.defineProperty(prototype, prop, {
      enumerable: true,
      get: function ( ) { return this.get.call(this.$__.scope || this, path); },
      set: function (v) {
        return this.set.call(this.$__.scope || this, path, v);
      }
    });
  }
};

/**
 * Helper for console.log
 *
 * @public
 */
Doc.prototype.inspect = function (options) {
  var opts = options && 'Object' == options.constructor.name ? options :
    this.schema.builtOpts.toObject ? utils.clone(this.schema.builtOpts.toObject) :
    {};
  opts.minimize = false;
  return inspect(this.toObject(opts));
};

/**
 * Converts this document into a plain javascript object, ready for storage in MongoDB.
 *
 * Buffers are converted to instances of [mongodb.Binary](http://mongodb.github.com/node-mongodb-native/api-bson-generated/binary.html) for proper storage.
 *
 * ####Options:
 *
 * - `getters` apply all getters (path and virtual getters)
 * - `virtuals` apply virtual getters (can override `getters` option)
 * - `minimize` remove empty objects (defaults to true)
 * - `transform` a transform function to apply to the resulting document before returning
 *
 * ####Getters/Virtuals
 *
 * Example of only applying path getters
 *
 *     doc.toObject({ getters: true, virtuals: false })
 *
 * Example of only applying virtual getters
 *
 *     doc.toObject({ virtuals: true })
 *
 * Example of applying both path and virtual getters
 *
 *     doc.toObject({ getters: true })
 *
 * To apply these options to every document of your schema by default, set your [schemas](#schema_Schema) `toObject` option to the same argument.
 *
 *     schema.set('toObject', { virtuals: true })
 *
 * ####Transform
 *
 * We may need to perform a transformation of the resulting object based on some criteria, say to remove some sensitive information or return a custom object. In this case we set the optional `transform` function.
 *
 * Transform functions receive three arguments
 *
 *     function (doc, ret, options) {}
 *
 * - `doc` The mongoose document which is being converted
 * - `ret` The plain object representation which has been converted
 * - `options` The options in use (either schema options or the options passed inline)
 *
 * ####Example
 *
 *     // specify the transform schema option
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       // remove the _id of every document before returning the result
 *       delete ret._id;
 *     }
 *
 *     // without the transformation in the schema
 *     doc.toObject(); // { _id: 'anId', name: 'Wreck-it Ralph' }
 *
 *     // with the transformation
 *     doc.toObject(); // { name: 'Wreck-it Ralph' }
 *
 * With transformations we can do a lot more than remove properties. We can even return completely new customized objects:
 *
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       return { movie: ret.name }
 *     }
 *
 *     // without the transformation in the schema
 *     doc.toObject(); // { _id: 'anId', name: 'Wreck-it Ralph' }
 *
 *     // with the transformation
 *     doc.toObject(); // { movie: 'Wreck-it Ralph' }
 *
 * _Note: if a transform function returns `undefined`, the return value will be ignored._
 *
 * Transformations may also be applied inline, overridding any transform set in the options:
 *
 *     function xform (doc, ret, options) {
 *       return { inline: ret.name, custom: true }
 *     }
 *
 *     // pass the transform as an inline option
 *     doc.toObject({ transform: xform }); // { inline: 'Wreck-it Ralph', custom: true }
 *
 * _Note: if you call `toObject` and pass any options, the transform declared in your schema options will __not__ be applied. To force its application pass `transform: true`_
 *
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.hide = '_id';
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       if (options.hide) {
 *         options.hide.split(' ').forEach(function (prop) {
 *           delete ret[prop];
 *         });
 *       }
 *     }
 *
 *     var doc = new Doc({ _id: 'anId', secret: 47, name: 'Wreck-it Ralph' });
 *     doc.toObject();                                        // { secret: 47, name: 'Wreck-it Ralph' }
 *     doc.toObject({ hide: 'secret _id' });                  // { _id: 'anId', secret: 47, name: 'Wreck-it Ralph' }
 *     doc.toObject({ hide: 'secret _id', transform: true }); // { name: 'Wreck-it Ralph' }
 *
 * Transforms are applied to the document _and each of its sub-documents_. To determine whether or not you are currently operating on a sub-document you might use the following guard:
 *
 *     if ('function' == typeof doc.ownerDocument) {
 *       // working with a sub doc
 *     }
 *
 * Transforms, like all of these options, are also available for `toJSON`.
 *
 * See [schema options](/docs/guide.html#toObject) for some more details.
 *
 * _During save, no custom options are applied to the document before being sent to the database._
 *
 * @param {Object} [options]
 *
 * @return {Object} js object
 * @public
 */

Doc.prototype.toObject = function (options) {
  //if (options && options.depopulate && this.$__.wasPopulated) {
  //  // populated paths that we set to a document
  //  return clone(this._id, options);
  //}

  // When internally saving this document we always pass options,
  // bypassing the custom schema options.
  if (!(options && 'Object' == options.constructor.name)) {
    options = this.schema.builtOpts.toObject
      ? utils.clone(this.schema.builtOpts.toObject)
      : {};
  }

  ;('minimize' in options) || (options.minimize = this.schema.builtOpts.minimize);

  var ret = utils.clone(this._doc, options);

  if (options.virtuals || options.getters && false !== options.virtuals) {
    applyGetters(this, ret, 'virtuals', options);
  }


  if (options.getters) {
    applyGetters(this, ret, 'paths', options);
    // applyGetters for paths will add nested empty objects;
    // if minimize is set, we need to remove them.
    if (options.minimize) {
      ret = minimize(ret) || {};
    }
  }

  // In the case where a subdocument has its own transform function, we need to
  // check and see if the parent has a transform (options.transform) and if the
  // child schema has a transform (this.schema.options.toObject) In this case,
  // we need to adjust options.transform to be the child schema's transform and
  // not the parent schema's
  if (true === options.transform ||
    (this.schema.builtOpts.toObject && options.transform)) {
    var opts = options.json
      ? this.schema.builtOpts.toJSON
      : this.schema.builtOpts.toObject;
    if (opts) {
      options.transform = opts.transform;
    }
  }

  if ('function' == typeof options.transform) {
    var xformed = options.transform(this, ret, options);
    if ('undefined' != typeof xformed) ret = xformed;
  }

  return ret;
};

/**
 * Minimizes an object, removing undefined values and empty objects
 *
 * @param {Object} obj to minimize
 * @return {Object}
 */
function minimize (obj) {
  var keys = Object.keys(obj)
    , i = keys.length
    , hasKeys
    , key
    , val

  while (i--) {
    key = keys[i];
    val = obj[key];

    if (utils.isObject(val)) {
      obj[key] = minimize(val);
    }
    else if (utils.isArray(val) && !val.length) {
      delete obj[key];
      continue;
    }
    else if (undefined === obj[key]) {
      delete obj[key];
      continue;
    }

    hasKeys = true;
  }

  return hasKeys
    ? obj
    : undefined;
};

/**
 * Applies virtuals properties to `json`.
 *
 * @param {Doc} self
 * @param {Object} json
 * @param {String} type either `virtuals` or `paths`
 * @param {Object} [options]
 *
 * @return {Object} `json`
 */
function applyGetters (self, json, type, options) {
  var schema = self.schema
    , paths = type === 'virtuals' ? Object.keys(schema.virtualPaths()) : schema.listPaths()
    , i = paths.length
    , path;

  while (i--) {
    path = paths[i];

    var parts = path.split('.')
      , plen = parts.length
      , last = plen - 1
      , branch = json
      , part

    for (var ii = 0; ii < plen; ++ii) {
      part = parts[ii];
      if (ii === last) {
        branch[part] = clone(self.get(path), options);
      } else {
        branch = branch[part] || (branch[part] = {});
      }
    }
  }

  return json;
};

/**
 * Helper for console.log
 *
 * @public
 */
Doc.prototype.toString = Doc.prototype.inspect;

/**
 * Builds the default doc structure
 * @param {Object} obj
 * @param {Object} [fields]
 * @param {Boolean} [skipId]
 *
 * @return {Object}
 * @protected
 */
Doc.prototype.$__buildDoc = function (obj, fields, skipId) {
  var doc = {}
    , exclude;

  // determine if this doc is a result of a query with
  // excluded fields
  if (fields && 'Object' === fields.constructor.name) {
    exclude = fields[Object.keys(fields).pop()] === 0;
  }

  var paths = this.schema.listPaths()
    , plen = paths.length;

  for (var ii = 0; ii < plen; ++ii) {
    var p = paths[ii];

    if ('@rid' == p) {
      if (skipId) continue;
      if (obj && '@rid' in obj) continue;
    }

    var schema = this.schema.path(p)
      , path = p.split('.')
      , len = path.length
      , last = len - 1
      , curPath = ''
      , doc_ = doc;

    for (var i = 0; i < len; ++i) {
      var piece = path[i]
        , def;

      // support excluding intermediary levels
      if (exclude) {
        curPath += piece;
        if (curPath in fields) break;
        curPath += '.';
      }

      if (i === last) {
        if (fields) {
          if (exclude){
            // apply defaults to all non-excluded fields
            if (p in fields) continue;

            def = schema.getDefault(this, true, p);
            if ('undefined' !== typeof def) {
              doc_[piece] = def;
              this.$__.activePaths.default(p);
            }
          }
          else if (p in fields) {
            // selected field
            def = schema.getDefault(this, true, p);
            if ('undefined' !== typeof def) {
              doc_[piece] = def;
              this.$__.activePaths.default(p);
            }
          }
        }
        else {
          def = schema.getDefault(this, true, p);
          if ('undefined' !== typeof def) {
            doc_[piece] = def;
            this.$__.activePaths.default(p);
          }
        }
      }
      else {
        doc_ = doc_[piece] || (doc_[piece] = {});
      }
    }
  }

  return doc;
};

/**
 * Initializes the document without setters or marking anything modified.
 *
 * Called internally after a document is returned from orientdb.
 *
 * @param {Object} obj document returned by orient
 *
 * @return {Doc}
 * @public
 */
Doc.prototype.init = function (obj) {
  this.isNew = false;
  init(this, obj, this._doc);
  this.emit('init', this);
  return this;
};

/**
 * Init helper.
 *
 * @param {Object} self document instance
 * @param {Object} obj raw mongodb doc
 * @param {Object} doc object we are initializing
 * @param {String} [prefix]
 */
function init (self, obj, doc, prefix) {
  prefix = prefix || '';

  var keys = Object.keys(obj)
    , len = keys.length
    , schema
    , path
    , i;

  while (len--) {
    i = keys[len];
    path = prefix + i;
    schema = self.schema.path(path);

    if (!schema && utils.isObject(obj[i]) &&
      (!obj[i].constructor || 'Object' == obj[i].constructor.name)) {
      // assume nested object
      if (!doc[i]) doc[i] = {};
      init(self, obj[i], doc[i], path + '.');
    }
    else {
      if (obj[i] === null) {
        doc[i] = null;
      }
      else if (obj[i] !== undefined) {
        if (schema) {
          self.$__try((function(schema, path, i, scope) {
            return function () {
              doc[i] = schema.cast(obj[i], path, scope, true);
            }
          })(schema, path, i, self), self, path);
        }
        else if (i[0] !== '@') {
          doc[i] = obj[i];
        }
      }
      // mark as hydrated
      self.$__.activePaths.init(path);
    }
  }
};

/**
 * Sets the value of a path, or many paths.
 *
 * @param {String|Object} path path or object of key/vals to set
 * @param {*} val the value to set
 * @param {SchemaType|String|Object} [type] optionally specify a type for "on-the-fly" attributes
 * @param {Object} [options] optionally specify options that modify the behavior of the set
 */
Doc.prototype.set = function (path, val, type, options) {
  if (utils.isObject(type)) {
    options = type;
    type = undefined;
  }

  TypeAny || (TypeAny = require('../dbSchema/types').Any);

  var merge = options && options.merge
    , adhoc = type && true !== type
    , constructing = true === type
    , strict = options && 'strict' in options ? options.strict : this.$__.strictMode
    , adhocs;

  if (adhoc) {
    adhocs = this.$__.adhocPaths || (this.$__.adhocPaths = {});
    adhocs[path] = Schema.interpretAsType(this.schema.base, path, type);
  }

  var pathType, i;

  if (!utils.isString(path)) {
    // new Document({ key: val })
    if (null === path || undefined === path) {
      var _ = path;
      path = val;
      val = _;

    }
    else {
      // here path is Object so val can contain prefix
      var prefix = val ? val + '.' : '';

      if (path instanceof Doc) path = path._doc;

      var keys = Object.keys(path)
        , key;
      i = keys.length;

      while (i--) {
        key = keys[i];
        pathType = this.schema.pathType(prefix + key);
        if (null != path[key]
            // need to know if plain object - no Buffer, ObjectId, ref, etc
          && utils.isObject(path[key])
          && !utils.isMap(prefix + key, this.schema)
          && (!path[key].constructor || 'Object' == path[key].constructor.name)
          && 'virtual' != pathType
          && !(this.$__path(prefix + key) instanceof TypeAny)
        ) {
          this.set(path[key], prefix + key, constructing);
        }
        else if (strict) {
          if ('real' === pathType || 'virtual' === pathType) {
            this.set(prefix + key, path[key], constructing);
          }
          else if ('throw' == strict) {
            throw new Error("Field `" + key + "` is not in schema.");
          }
        }
        else if (undefined !== path[key]) {
          this.set(prefix + key, path[key], constructing);
        }
      }

      return this;
    }
  }

  pathType = this.schema.pathType(path);

  var parts = path.split('.')
    , schema
    , subpath;

  if ('adhocOrUndefined' == pathType && strict) {
    // check for roots that are Mixed types
    var mixed;
    for (i = 0; i < parts.length; ++i) {
      subpath = parts.slice(0, i+1).join('.');
      schema = this.schema.path(subpath);
      if (schema instanceof TypeAny) {
        // allow changes to sub paths of mixed types
        mixed = true;
        break;
      }
    }

    if (!mixed) {
      if ('throw' == strict) {
        throw new Error("Field `" + path + "` is not in schema.");
      }
      return this;
    }
  }
  else if ('virtual' == pathType) {
    schema = this.schema.virtualpath(path);
    schema.applySetters(val, this);
    return this;
  }
  else {
    schema = this.$__path(path);
  }

  var pathToMark;

  if (parts.length <= 1) {
    pathToMark = path;
  }
  else {
    for (i = 0; i < parts.length; ++i) {
      subpath = parts.slice(0, i+1).join('.');
      if (this.isDirectModified(subpath) // earlier prefixes that are already
          // marked as dirty have precedence
        || this.get(subpath) === null) {
        pathToMark = subpath;
        break;
      }
    }

    if (!pathToMark) pathToMark = path;
  }

  // if this doc is being constructed we should not trigger getters
  var priorVal = constructing ? undefined : this.get(path);

  if (!schema || undefined === val) {
    this.$__set(pathToMark, path, constructing, parts, schema, val, priorVal);
    return this;
  }

  var self = this;
  var shouldSet = this.$__try(function () {
    val = schema.applySetters(val, self.$__fullPath(path), self, false, priorVal);
  }, this, path);

  if (shouldSet) {
    this.$__set(pathToMark, path, constructing, parts, schema, val, priorVal);
  }

  return this;
};

/**
 * Returns the value of a path.
 *
 * ####Example
 *
 *     // path
 *     doc.get('age') // 47
 *
 *     // dynamic casting to a string
 *     doc.get('age', String) // "47"
 *
 * @param {String} path
 * @param {String} [type] optionally specify a type for on-the-fly attributes
 *
 * @return {*}
 * @public
 */
Doc.prototype.get = function (path, type) {
  var adhocs;
  if (type) {
    adhocs = this.$__.adhocPaths || (this.$__.adhocPaths = {});
    adhocs[path] = Schema.interpretAsType(this.schema.base, path, type);
  }

  var schema = this.$__path(path) || this.schema.virtualpath(path)
    , pieces = path.split('.')
    , obj = this._doc;

  for (var i = 0, l = pieces.length; i < l; i++) {
    obj = undefined === obj || null === obj
      ? undefined
      : obj[pieces[i]];
  }

  if (schema) {
    obj = schema.applyGetters(obj, this);
  }

  return obj;
};

/**
 * Returns true if `path` was directly set and modified, else false.
 *
 * ####Example
 *
 *     doc.set('documents.0.title', 'changed');
 *     doc.isDirectModified('documents.0.title') // true
 *     doc.isDirectModified('documents') // false
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */
Doc.prototype.isDirectModified = function (path) {
  return (path in this.$__.activePaths.states.modify);
};

/**
 * Returns true if this document was modified, else false.
 *
 * If `path` is given, checks if a path or any full path containing `path` as part of its path chain has been modified.
 *
 * ####Example
 *
 *     doc.set('documents.0.title', 'changed');
 *     doc.isModified()                    // true
 *     doc.isModified('documents')         // true
 *     doc.isModified('documents.0.title') // true
 *     doc.isDirectModified('documents')   // false
 *
 * @param {String} [path] optional
 *
 * @return {Boolean}
 * @public
 */
Doc.prototype.isModified = function (path) {
  return path
    ? !!~this.modifiedPaths().indexOf(path)
    : this.$__.activePaths.some('modify');
};

/**
 * Returns the list of paths that have been modified.
 *
 * @return {Array}
 * @public
 */
Doc.prototype.modifiedPaths = function () {
  var directModifiedPaths = Object.keys(this.$__.activePaths.states.modify);

  return directModifiedPaths.reduce(function (list, path) {
    var parts = path.split('.');
    return list.concat(parts.reduce(function (chains, part, i) {
      return chains.concat(parts.slice(0, i).concat(part).join('.'));
    }, []));
  }, []);
};

/**
 * Marks the path as having pending changes to write to the db.
 *
 * _Very helpful when using [Mixed](./schematypes.html#mixed) types._
 *
 * ####Example:
 *
 *     doc.mixed.type = 'changed';
 *     doc.markModified('mixed.type');
 *     doc.save() // changes to mixed.type are now persisted
 *
 * @param {String} path the path to mark modified
 * @public
 */
Doc.prototype.markModified = function (path) {
  this.$__.activePaths.modify(path);
};

/**
 * Checks if `path` was initialized.
 *
 * @param {String} path
 *
 * @return {Boolean}
 * @public
 */
Doc.prototype.isInit = function (path) {
  return (path in this.$__.activePaths.states.init);
};

/**
 * Checks if `path` was selected in the source query which initialized this document.
 *
 * ####Example
 *
 *     Thing.findOne().select('name').exec(function (err, doc) {
 *        doc.isSelected('name') // true
 *        doc.isSelected('age')  // false
 *     })
 *
 * @param {String} path
 *
 * @return {Boolean}
 * @public
 */
Doc.prototype.isSelected = function (path) {
  if (this.$__.selected) {

    //if ('_id' === path) {
    //  return 0 !== this.$__.selected._id;
    //}

    var paths = Object.keys(this.$__.selected)
      , i = paths.length
      , inclusive = false
      , cur

    //if (1 === i && '_id' === paths[0]) {
    //  // only _id was selected.
    //  return 0 === this.$__.selected._id;
    //}

    while (i--) {
      cur = paths[i];
      //if ('_id' == cur) continue;
      inclusive = !! this.$__.selected[cur];
      break;
    }

    if (path in this.$__.selected) {
      return inclusive;
    }

    i = paths.length;
    var pathDot = path + '.';

    while (i--) {
      cur = paths[i];
      if ('_id' == cur) continue;

      if (0 === cur.indexOf(pathDot)) {
        return inclusive;
      }

      if (0 === pathDot.indexOf(cur + '.')) {
        return inclusive;
      }
    }

    return ! inclusive;
  }

  return true;
};

/**
 * Handles the actual setting of the value and marking the path modified if appropriate.
 * @private
 */
Doc.prototype.$__set = function (pathToMark, path, constructing, parts, schema, val, priorVal) {
  var shouldModify = this.$__shouldModify.apply(this, arguments);

  if (shouldModify) {
    this.markModified(pathToMark);

    // handle directly setting arrays (gh-1126)
    //MongooseArray || (MongooseArray = require('./types/array'));
    //if (val instanceof MongooseArray) {
    //  val.$__registerAtomic('$set', val);
    //}
  }

  var obj = this._doc
    , i = 0
    , l = parts.length

  for (; i < l; i++) {
    var next = i + 1
      , last = next === l;

    if (last) {
      obj[parts[i]] = val;
    } else {
      if (obj[parts[i]] && 'Object' === obj[parts[i]].constructor.name) {
        obj = obj[parts[i]];
      } else if (obj[parts[i]] && utils.isArray(obj[parts[i]])) {
        obj = obj[parts[i]];
      } else {
        obj = obj[parts[i]] = {};
      }
    }
  }
};

/**
 * Determine if we should mark this change as modified.
 *
 * @return {Boolean}
 * @private
 */
Doc.prototype.$__shouldModify = function (pathToMark, path, constructing, parts, schema, val, priorVal) {
  if (this.isNew) return true;
  if (this.isDirectModified(pathToMark)) return false;

  if (undefined === val && !this.isSelected(path)) {
    // when a path is not selected in a query, its initial
    // value will be undefined.
    return true;
  }

  if (undefined === val && path in this.$__.activePaths.states.default) {
    // we're just unsetting the default value which was never saved
    return false;
  }

  if (!utils.deepEqual(val, priorVal || this.get(path))) {
    return true;
  }

  if (!constructing &&
    null != val &&
    path in this.$__.activePaths.states.default &&
    utils.deepEqual(val, schema.getDefault(this, constructing, path))) {
    // a path with a default was $unset on the server
    // and the user is setting it to the same value again
    return true;
  }

  return false;
};

/**
 * Catches errors that occur during execution of `fn` and stores them to later be passed when `save()` is executed.
 *
 * @param {Function} fn function to execute
 * @param {Object} [scope] the scope with which to call fn
 *
 * @return {*}
 * @private
 */
Doc.prototype.$__try = function (fn, scope, path) {
  var res;
  try {
    fn.call(scope);
    res = true;
  }
  catch (e) {
    this.$__error(path, e);
    res = false;
  }
  return res;
};

/**
 * Registers an error
 * @param {String} path
 * @param {Error} err
 *
 * @return {Doc} this
 * @public
  */
Doc.prototype.$__error = function (path, err) {
  //if (!this.$__.validationError) {
  //  this.$__.validationError = new ValidationError();
  //}
  //
  //if (!err || 'string' === typeof err) {
  //  err = new ValidatorError(path, err, 'user defined', val)
  //}
  //
  //if (this.$__.validationError == err) return;
  //
  //this.$__.validationError.errors[path] = err;

  // new
  if (!this.$__.saveError) {
    this.$__.saveError = new SaveError();
  }

  this.$__.saveError.errors[path] = err;
  return this;
};

/**
 * Returns the schematype for the given `path`.
 *
 * @param {String} path
 *
 * @return {SchemaType}
 * @private
 */
Doc.prototype.$__path = function (path) {
  var adhocs = this.$__.adhocPaths
    , adhocType = adhocs && adhocs[path];

  if (adhocType) {
    return adhocType;
  } else {
    return this.schema.path(path);
  }
};

/**
 * Resets the internal modified state of this document.
 *
 * @return {Doc}
 * @public
 */
Doc.prototype.$__reset = function () {
  var self = this;

  this.$__.activePaths
    .map('init', 'modify', function (i) {
      return self.getValue(i);
    })
    .filter(function (val) {
      return val && utils.isOrientContainer(val) && val.count();
    })
    .forEach(function (container) {
      container.$__reset();
    });

  // clear atomics
  this.$__dirty().forEach(function (dirt) {
    var type = dirt.value;
    if (type && type._atomics) {
      type._atomics = {};
    }
  });

  // Clear 'modify'('dirty') cache
  this.$__.activePaths.clear('modify');
  this.$__.validationError = undefined;
  this.errors = undefined;

  this.schema.requiredPaths().forEach(function (path) {
    self.$__.activePaths.require(path);
  });

  return this;
};

/**
 * Returns this documents dirty paths / vals.
 *
 * @return {Array}
 * @protected
 */
Doc.prototype.$__dirty = function () {
  var self = this;

  var all = this.$__.activePaths.map('modify', function (path) {
    return {
      path: path,
      value: self.getValue(path),
      schema: self.$__path(path)
    };
  });

  // Sort dirty paths in a flat hierarchy.
  all.sort(function (a, b) {
    return (a.path < b.path ? -1 : (a.path > b.path ? 1 : 0));
  });

  // Ignore "foo.a" if "foo" is dirty already.
  var minimal = []
    , lastPath
    , top;

  all.forEach(function (item, i) {
    if (item.path.indexOf(lastPath) !== 0) {
      lastPath = item.path + '.';
      minimal.push(item);
      top = item;
    }
    else {
      // special case for top level OrientContainer
      if (top.value && top.value._atomics && top.value.$__hasAtomics()) {
        // the `top` array itself and a sub path of `top` are being modified.
        // the only way to honor all of both modifications is through a $set
        // of entire array.
        top.value._atomics = {};
        top.value._atomics.$set = top.value;
      }
    }
  });

  top = lastPath = null;
  return minimal;
};

/**
 * Register default hooks
 *
 * @private
 */
Doc.prototype.$__registerHooks = function () {
  if (!this.save) return;

  this.pre('save', function checkForExistingErrors (next) {
    // if any doc.set() calls failed
    var err = this.$__.saveError;
    if (err) {
      this.$__.saveError = null;
      return next(err);
    }
    else return next();

  }, function errHandler (err) {
    // emit on the Model if listening
    if (this.constructor.listeners('error').length) {
      this.constructor.emit('error', err);
    }

    // TODO: implement Connection.emit
    //else {
    //  // emit on the connection
    //  if (!this.db.listeners('error').length) {
    //    err.stack = 'No listeners detected, throwing. '
    //    + 'Consider adding an error listener to your connection.\n'
    //    + err.stack
    //  }
    //  this.db.emit('error', err);
    //}

    return Promise.reject(err);

  }).pre('save', function validation (next) {
    return this.validate(next);
  });

  // add user defined queues
  this.$__doQueue();
};

/**
 * Executes methods queued from the Schema definition
 *
 * @return {Doc} this
 * @private
 */
Doc.prototype.$__doQueue = function () {
  var q = this.schema && this.schema.callQueue;
  if (q) {
    for (var i = 0, l = q.length; i < l; i++) {
      this[q[i][0]].apply(this, q[i][1]);
    }
  }
  return this;
};

/**
 * Executes registered validation rules for this document.
 * @param {Function} cb called after validation completes, passing an error if one occurred
 * @param {String} [prefix]
 *
 * @return {*}
 * @public
 */
Doc.prototype.validate = function (cb, prefix) {
  var self = this;

  // only validate required fields when necessary
  var paths = Object.keys(this.$__.activePaths.states.require).filter(function (path) {
    return self.isSelected(path) || self.isModified(path);
  });
  paths = paths.concat(Object.keys(this.$__.activePaths.states.init));
  paths = paths.concat(Object.keys(this.$__.activePaths.states.modify));
  paths = paths.concat(Object.keys(this.$__.activePaths.states.default));

  if (0 === paths.length) {
    return complete();
  }

  var len = paths.length
    , path, schema, val;

  prefix = prefix ? prefix + '.' : '';

  for (var i = 0; i < len; i++) {
    path = paths[i];
    // we don't need to validate subpaths
    // because it will be validated later by containers
    if (/\./.test(path)) continue;

    schema = this.schema.path(path);
    if (!schema) continue;

    val = this.getValue(path);

    schema.doValidate(val, prefix + path, function (err) {
      if (err) {
        self.invalidate(
          path,
          err,
          val,
          true // embedded docs
        );
      }
    }, this);
  }
  return complete();

  function complete () {
    var err = self.$__.validationError;

    self.$__.validationError = undefined;
    self.emit('validate', self);
    return cb(err);
  }
};

/**
 * Marks a path as invalid, causing validation to fail.
 *
 * The `err` argument will become the message of the `ValidationError`.
 *
 * The `val` argument (if passed) will be available through the `ValidationError.value` property.
 *
 *     doc.invalidate('size', 'must be less than 20', 14);

 *     doc.validate(function (err) {
 *       console.log(err)
 *       // prints
 *       { message: 'Validation failed',
 *         name: 'ValidationError',
 *         errors:
 *          { size:
 *             { message: 'must be less than 20',
 *               name: 'ValidatorError',
 *               path: 'size',
 *               type: 'user defined',
 *               value: 14 } } }
 *     })
 *
 * @param {String} path the field to invalidate
 * @param {String|Error} err the error which states the reason `path` was invalid
 * @param {Object|String|Number|*} [val] optional invalid value
 *
 * @public
 */
Doc.prototype.invalidate = function (path, err, val) {
  if (!this.$__.validationError) {
    this.$__.validationError = new ValidationError(this);
  }

  if (!err || 'string' === typeof err) {
    err = new ValidatorError(path, err, 'user defined', val)
  }

  if (this.$__.validationError == err) return;

  this.$__.validationError.errors[path] = err;
};

/**
 * Gets a raw value from a property (no getters)
 * @param {String} path
 *
 * @return {*}
 * @private
 */
Doc.prototype.getValue = function (path) {
  return utils.getValue(path, this._doc);
};

/**
 * Sets a raw value for a path (no casting, setters, transformations)
 *
 * @param {String} path
 * @param {Object} val
 *
 * @return {Doc} this
 * @private
 */
Doc.prototype.setValue = function (path, val) {
  utils.setValue(path, val, this._doc);
  return this;
};

/**
 * Returns the full path to this document.
 *
 * @param {String} [path]
 *
 * @return {String}
 * @public
 */
Doc.prototype.$__fullPath = function (path) {
  // overridden in SubDocuments
  return path || '';
};

/**
 * Returns true if the Document stores the same data as doc.
 *
 * Documents are considered equal when they have matching `_id`s.
 * @param {Doc} doc a document to compare
 *
 * @return {Boolean}
 * @public
 */
Doc.prototype.equals = function (doc) {
  return JSON.stringify(this._doc) === JSON.stringify(doc._doc);
};

module.exports = Doc;