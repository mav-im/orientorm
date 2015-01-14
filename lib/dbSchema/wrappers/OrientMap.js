var EmbeddedDocument = require('../../model/EmbeddedDocument')
  , utils = require('../../utils')
  , inspect = require('util').inspect
  , mixins = require('./mixins');

/**
 * Map of items
 * @param {Object} values
 * @param {String} path
 * @param {Doc} doc
 * @param {String} mode (list|set)
 *
 * @constructor
 * @implements {OrientContainer}
 */
function OrientMap (values, path, doc) {
  this._atomics = {};
  this._path = path;

  values = values || {};
  this._properties = {};
  for (var i in values) {
    if (!values.hasOwnProperty(i)) continue;
    this._properties[i] = values[i];
    //registerProperty(this, i);
  }

  if (doc) {
    this._parent = doc;
    this._schema = doc.schema.path(path);
    this._schema.schema().listPaths().forEach(function (key) {
      if (key[0] === '@') return;
      //registerProperty(this, key);
    }, this);

    doc.on('save', this.notify('save'));
    doc.on('isNew', this.notify('isNew'));
  }
};

/**
 * @type {Object}
 * @protected
 */
OrientMap.prototype._properties;

/**
 * Parent owner document
 *
 * @type {Doc}
 * @public
 */
OrientMap.prototype._parent;

/**
 * Parent owner document
 *
 * @type {String}
 * @public
 */
OrientMap.prototype._path;

/**
 * @type {SchemaType}
 * @public
 */
OrientMap.prototype._schema;

/**
 * Returns the full path to this document. If optional `path` is passed, it is appended to the full path.
 * @param {String|Number} [path]
 *
 * @return {String}
 * @public
 */
OrientMap.prototype.$__fullPath = mixins.fullPath();

/**
 * Get number of items
 *
 * @return {Number}
 * @public
 */
OrientMap.prototype.count = function () {
  return utils.count(this._properties);
};

/**
 * Return the index of object
 * @param {*} obj The item to look for
 *
 * @return {String|Number}
 * @public
 */
OrientMap.prototype.indexOf = function (obj) {
  if (obj && obj.schema) {
    return obj._path;
  }
  for (var i in this._properties) {
    if (!this._properties.hasOwnProperty(i)) continue;
    if (obj == this._properties[i])
      return i;
  }

  return -1;
};

/**
 * Marks this container as modified.
 *
 * If it bubbles up from an embedded document change, then it takes the following arguments (otherwise, takes 0 arguments)
 *
 * @param {Doc} [elem] the embedded doc that invoked this method on the Array
 * @param {String} [embeddedPath] the path which changed in the embeddedDoc
 *
 * @return {OrientMap}
 * @public
 */
OrientMap.prototype.$__markModified = mixins.markModified();

/**
 * Register an atomic operation with the parent.
 *
 * @param {String} op operation
 * @param {*} val
 * @param {String} [key]
 *
 * @return {OrientMap}
 * @public
 */
OrientMap.prototype.$__registerAtomic = function (op, val, key) {
  if (op === '$set') {
    // $set takes precedence over all other ops.
    // mark entire array modified.
    this._atomics = { $set: val };
    return this;
  }

  var atomics = this._atomics;

  if (op === '$put') {
    atomics[op] || (atomics[op] = {});
    atomics[op][key] = val;
  }
  else {
    atomics[op] || (atomics[op] = []);
    atomics[op] = atomics[op].concat(val);
  }

  return this;
};

/**
 * Depopulates stored atomic operation values as necessary for direct insertion to OrientDB.
 *
 * If no atomics exist, we return all container values after conversion.
 *
 * @return {Array}
 * @public
 */
OrientMap.prototype.$__getAtomics = mixins.getAtomics();

/**
 * Returns the number of pending atomic operations to send to the db for this container.
 *
 * @return {Number}
 * @public
 */
OrientMap.prototype.$__hasAtomics = mixins.hasAtomics();

/**
 * Returns a native js Array.
 * @param {Object} options
 *
 * @return {Object}
 * @public
 */
OrientMap.prototype.toObject = function (options) {
  var result = {};

  this.forEach(function (item, key) {
    result[key] = item instanceof EmbeddedDocument
      ? item.toObject(options)
      : item;
  });

  return result;
};

/**
 * Helper for console.log
 *
 * @return {String}
 * @public
 */
OrientMap.prototype.inspect = function () {
  return inspect(this._properties);
};

/**
 * Resets the internal modified state of subdocuments.
 *
 * @return {OrientMap}
 * @public
 */
OrientMap.prototype.$__reset = mixins.reset();

/**
 * Create an instance of schema entry
 * @param {*} obj
 *
 * @return {*}
 * @public
 */
OrientMap.prototype.create = mixins.create();

/**
 * Creates a fn that notifies all child docs of `event`.
 *
 * @param {String} event
 *
 * @return {Function}
 * @protected
 */
OrientMap.prototype.notify = mixins.notify();

/**
 * Make iteration over each item
 * @param {Function} cb
 * @param {*} [thisArg]
 *
 * @public
 */
OrientMap.prototype.forEach = function (cb, thisArg) {
  for (var i in this._properties) {
    if (!this._properties.hasOwnProperty(i)) continue;
    if (thisArg) {
      cb.call(thisArg, this._properties[i], i, this._properties);
    }
    else {
      cb(this._properties[i], i, this._properties);
    }
  }
};

/**
 * Casts a member based on this arrays schema.
 *
 * @param {*} value
 * @param {String} [path]
 * @param {Boolean} [init]
 *
 * @return {*}
 * @protected
 */
OrientMap.prototype._cast = function (value, path, init) {
  var schematype = this._schema.path(path, false);
  return schematype.cast(value, this.$__fullPath(path), this._parent, init, null, this);
};

/**
 * Catches errors that occur during execution of `fn` and stores them in parent Document or rethrow
 *
 * @param {Function} fn function to execute
 * @param {Object} [scope] the scope with which to call fn
 *
 * @return {*}
 * @private
 */
OrientMap.prototype.$__try = function (fn, scope) {
  var res;
  try {
    fn.call(scope);
    res = true;
  }
  catch (e) {
    this.$__error(e);
    res = false;
  }
  return res;
};

/**
 * Registers an error
 *
 * @param {Error} err
 *
 * @return {OrientMap} this
 * @private
 */
OrientMap.prototype.$__error = function (err) {
  if (this._parent) {
    this._parent.$__error(this.$__fullPath(), err);
  }
  else {
    throw err;
  }
  return this;
};

/**
 * Puts a value into map prefixed by key
 * @param {String|Object} key
 * @param {*} value
 *
 * @return {OrientMap}
 * @public
 */
OrientMap.prototype.put = function (key, value) {
  if (utils.isObject(key)) {
    // iterate over values provided as object
    for (var i in key) {
      if (!key.hasOwnProperty(i)) continue;
      this.put(i, key[i]);
    }
    return this;
  }

  var val
    , shouldDo = this.$__try(function () {
        val = this._cast(value, key);
      }, this);

  if (shouldDo) {
    this._properties[key] = val;
    //registerProperty(this, key);
    this.$__registerAtomic('$put', val, key);
    // because of the bug with multiple PUT action in SQL we need to use $set atomic
    //this.$__registerAtomic('$set', this);
    this.$__markModified();
  }

  return this;
};

function registerProperty (prototype, key) {
  Object.defineProperty(prototype, key, {
    configurable: true,
    enumerable: true,
    get: function () { return this._properties[key];}
    //set: function (value) {
    //  this.put(key, value);
    //}
  });
};

/**
 * Remove item by key
 * @param {String} [...]
 *
 * @return {OrientMap}
 * @public
 */
OrientMap.prototype.remove = function () {
  if (!arguments.length) return this;

  [].forEach.call(arguments, function (key) {
    if (this._properties.hasOwnProperty(key)) {
      delete this._properties[key];
      this.$__registerAtomic('$remove', key);
      this.$__markModified();
    }
  }, this);

  return this;
};

/**
 * Get value by key
 * @param {String} key
 *
 * @return {*}
 * @public
 */
OrientMap.prototype.get = function (key) {
  return this._properties[key];
};

///**
// * Save sub-documents
// *
// * @return {OrientMap}
// * @public
// */
//OrientMap.prototype.$__save = mixins.save();

module.exports = OrientMap;