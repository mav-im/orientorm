var EmbeddedDocument = require('../../model/EmbeddedDocument')
  , utils = require('../../utils')
  , mixins = require('./mixins');

/**
 * List and Set container based on Array
 * @param {Array} values
 * @param {String} path
 * @param {Object} doc
 * @param {String} mode (list|set)
 *
 * @constructor
 * @extends {Array}
 * @implements {OrientContainer}
 */
function OrientArray (values, path, doc, mode) {
  var arr = [];
  arr.push.apply(arr, values);
  arr.__proto__ = OrientArray.prototype;

  arr._atomics = {};
  arr.validators = [];
  arr._path = path;
  arr._mode = mode;

  if (doc) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
    doc.on('save', arr.notify('save'));
    doc.on('isNew', arr.notify('isNew'));
  }

  return arr;
};

/**
 * Inherit from Array
 */
OrientArray.prototype = new Array;

/**
 * Parent owner document
 *
 * @type {Doc}
 * @public
 */
OrientArray.prototype._parent;

/**
 * Parent owner document
 *
 * @type {String}
 * @public
 */
OrientArray.prototype._path;

/**
 * @type {SchemaType}
 * @public
 */
OrientArray.prototype._schema;

/**
 * Mode (list|set). Set can contain only unique values
 * @type {String}
 */
OrientArray.prototype._mode;

/**
 * Returns the full path to this document. If optional `path` is passed, it is appended to the full path.
 * @param {String|Number} [path]
 *
 * @return {String}
 * @public
 */
OrientArray.prototype.$__fullPath = mixins.fullPath();

/**
 * Get number of items
 *
 * @return {Number}
 * @public
 */
OrientArray.prototype.count = function () {
  return this.length;
};

/**
 * Return the index of `obj` or `-1` if not found.
 *
 * @param {Object} obj the item to look for
 *
 * @return {Number}
 * @public
 */
OrientArray.prototype.indexOf = function indexOf (obj) {
  for (var i = 0, len = this.length; i < len; ++i) {
    if (obj == this[i])
      return i;
  }
  return -1;
};

/**
 * Marks this array as modified.
 *
 * If it bubbles up from an embedded document change, then it takes the following arguments (otherwise, takes 0 arguments)
 *
 * @param {Doc} [elem] the embedded doc that invoked this method on the Array
 * @param {String} [embeddedPath] the path which changed in the embeddedDoc
 *
 * @return {OrientArray}
 * @public
 */
OrientArray.prototype.$__markModified = mixins.markModified();

/**
 * Register an atomic operation with the parent.
 *
 * @param {String} op operation
 * @param {*} val
 *
 * @return {OrientArray}
 * @public
 */
OrientArray.prototype.$__registerAtomic = function (op, val) {
  if (op === '$set') {
    // $set takes precedence over all other ops.
    // mark entire array modified.
    this._atomics = { $set: val };
    return this;
  }

  var atomics = this._atomics;

  // store whole array in case of atomics combo
  if (this._atomics.$set ||
    Object.keys(atomics).length && !(op in atomics)) {
    // a different op was previously registered.
    // save the entire thing.
    this._atomics = { $set: this };
    return this;
  }

  atomics[op] || (atomics[op] = []);
  atomics[op] = atomics[op].concat(val);

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
OrientArray.prototype.$__getAtomics = mixins.getAtomics();

/**
 * Returns the number of pending atomic operations to send to the db for this container.
 *
 * @return {Number}
 * @public
 */
OrientArray.prototype.$__hasAtomics = mixins.hasAtomics();

/**
 * Returns a native js Array.
 * @param {Object} options
 *
 * @return {Array}
 * @public
 */
OrientArray.prototype.toObject = function (options) {
  return this.map(function (doc) {
    return doc instanceof EmbeddedDocument
      ? doc.toObject(options)
      : doc
  });
};

/**
 * Helper for console.log
 *
 * @return {String}
 * @public
 */
OrientArray.prototype.inspect = function () {
  if (!this.count()) return '[]';

  return '[' + this.map(function (doc) {
      return ' ' + doc;
    }) + ' ]';
};

/**
 * Resets the internal modified state of subdocuments.
 *
 * @return {OrientArray}
 * @public
 */
OrientArray.prototype.$__reset = mixins.reset();

/**
 * Create an instance of schema entry
 * @param {*} obj
 *
 * @return {*}
 * @public
 */
OrientArray.prototype.create = mixins.create();

/**
 * Creates a fn that notifies all child docs of `event`.
 *
 * @param {String} event
 *
 * @return {Function}
 * @protected
 */
OrientArray.prototype.notify = mixins.notify();

/**
 * Make iteration over each item
 * @param {Function} cb
 * @param {*} [thisArg]
 *
 * @public
 */
OrientArray.prototype.forEach = function (cb, thisArg) {
  var len = this.length;
  for (var i = 0; i < len; ++i) {
    if (thisArg) {
      cb.call(thisArg, this[i], i, this);
    }
    else {
      cb(this[i], i, this);
    }
  }
};

/**
 * Casts a member based on this arrays schema.
 *
 * @param {*} value
 * @param {Number} [id]
 * @param {Array} [array]
 * @param {Boolean} [init]
 *
 * @return {*}
 * @protected
 */
OrientArray.prototype._cast = function (value, id, array, init) {
  return this._schema.getEntry().cast(value, this.$__fullPath(id), this._parent, init, null, this);
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
OrientArray.prototype.$__try = function (fn, scope) {
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
 * @return {OrientArray} this
 * @private
 */
OrientArray.prototype.$__error = function (err) {
  if (this._parent) {
    this._parent.$__error(this.$__fullPath(), err);
  }
  else {
    throw err;
  }
  return this;
};

/**
 * Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking.
 *
 * @param {Object} [...]
 *
 * @return {Number} Array length
 * @public
 */
OrientArray.prototype.push = function () {
  var values
    , args = arguments
    , shouldDo;

  if (this._mode === 'set') {
    // only unique values allowed

    shouldDo = this.$__try(function () {
      // we don't need mark modified this instance until we are sure it will be added
      values = [].map.call(args, mixins.castWrapper(this, true), this);
    }, this);

    if (shouldDo) {
      values = values.map(function (v) {
        var found
          , type = v instanceof EmbeddedDocument ? 'doc' :
            v instanceof Date ? 'date' : '';
        switch (type) {
          case 'doc':
            found = this.some(function(doc){ return doc.equals(v) });
            break;

          case 'date':
            var val = +v;
            found = this.some(function(d){ return +d === val });
            break;

          default:
            found = ~this.indexOf(v);
        }

        return found ? undefined : v;
      }, this).filter(function (item) {
        return 'undefined' !== typeof item;
      }).map(function (v) {
        // here we are sure item will be added, so cast it normal way
        return this._cast(utils.clone(v));
      }, this);
    }
  }
  else {
    shouldDo = this.$__try(function () {
      values = [].map.call(args, this._cast, this);
    }, this);
  }

  if (shouldDo && values.length) {
    [].push.apply(this, values);
    this.$__registerAtomic('$add', values);
    this.$__markModified();
  }

  return this.length;
};

/**
 * Wraps [`Array#pop`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/pop) with proper change tracking.
 *
 * ####Note:
 *
 * _marks the entire array as modified which will pass the entire thing to $set potentially overwritting any changes that happen between when you retrieved the object and when you save it._
 *
 * @public
 */
OrientArray.prototype.pop = function () {
  var ret = [].pop.call(this);
  this.$__registerAtomic('$set', this);
  this.$__markModified();
  return ret;
};

/**
 * Wraps [`Array#shift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
 *
 * ####Example:
 *
 *     doc.array = [2,3];
 *     var res = doc.array.shift();
 *     console.log(res) // 2
 *     console.log(doc.array) // [3]
 *
 * ####Note:
 *
 * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
 *
 * @return {*}
 * @public
 */
OrientArray.prototype.shift = function () {
  var ret = [].shift.call(this);
  this.$__registerAtomic('$set', this);
  this.$__markModified();
  return ret;
};

/**
 * Wraps [`Array#unshift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.
 *
 * ####Note:
 * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
 *
 * @return {Number} length
 * @public
 */
OrientArray.prototype.unshift = function () {
  var args = arguments
    , values
    , shouldDo = this.$__try(function () {
        values = [].map.call(args, this._cast, this);
      }, this);

  if (shouldDo) {
    [].unshift.apply(this, values);
    this.$__registerAtomic('$set', this);
    this.$__markModified();
  }
  return this.length;
};

/**
 * Wraps [`Array#splice`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/splice) with proper change tracking and casting.
 *
 * ####Note:
 *
 * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
 *
 * @return {Array|undefined}
 * @public
 */
OrientArray.prototype.splice = function splice () {
  var ret, vals, i
    , args = arguments;

  if (arguments.length) {
    var shouldDo = this.$__try(function () {
      vals = [];
      for (i = 0; i < args.length; ++i) {
        vals[i] = i < 2
          ? args[i]
          : this._cast(args[i]);
      }
    }, this);

    if (shouldDo) {
      ret = [].splice.apply(this, vals);
      this.$__registerAtomic('$set', this);
      this.$__markModified();
    }
  }

  return ret;
};

/**
 * Wraps [`Array#sort`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/sort) with proper change tracking.
 *
 * ####NOTE:
 *
 * _marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwritting any changes that happen between when you retrieved the object and when you save it._
 *
 * @return {Array}
 * @public
 */
OrientArray.prototype.sort = function () {
  var ret = [].sort.apply(this, arguments);
  this.$__registerAtomic('$set', this);
  this.$__markModified();
  return ret;
};

/**
 * Pulls items from the array atomically.
 *
 * ####Examples:
 *
 *     doc.array.pull(ObjectId)
 *     doc.array.pull({ _id: 'someId' })
 *     doc.array.pull(36)
 *     doc.array.pull('tag 1', 'tag 2')
 *
 * To remove a document from a subdocument array we may pass an object with a matching `_id`.
 *
 *     doc.subdocs.push({ _id: 4815162342 })
 *     doc.subdocs.pull({ _id: 4815162342 }) // removed
 *
 * Or we may passing the _id directly and let mongoose take care of it.
 *
 *     doc.subdocs.push({ _id: 4815162342 })
 *     doc.subdocs.pull(4815162342); // works
 *
 * @param {*} [...]
 *
 * @return {OrientArray}
 * @public
 */
OrientArray.prototype.pull = function () {
  var args = arguments
    , values
    , shouldDo = this.$__try(function () {
        values = [].map.call(args, mixins.castWrapper(this, true), this);
      }, this);

  if (shouldDo) {
    var cur = this._parent.get(this._path)
      , i = cur.length
      , mem
      , modified = false;

    while (i--) {
      mem = cur[i];
      if (mem instanceof EmbeddedDocument) {
        if (values.some(function (v) { return v.equals(mem); } )) {
          [].splice.call(cur, i, 1);
          modified = true;
        }
      }
      else if (~cur.indexOf.call(values, mem)) {
        modified = true;
        [].splice.call(cur, i, 1);
      }
    }

    if (modified) {
      if (values[0] instanceof EmbeddedDocument) {
        // we have to use $set here because of bug in SQL remove with embedded documents
        // causing to remove first item instead of selected
        this.$__registerAtomic('$set', this);
      }
      else {
        this.$__registerAtomic('$remove', values);
      }

      this.$__markModified();
    }
  }

  return this;
};

/**
 * Alias of [push]
 *
 * @see OrientArray#push
 * @return {OrientArray}
 * @public
 */
OrientArray.prototype.add = OrientArray.prototype.push;

/**
 * Alias of [pull]
 *
 * @see OrientArray#pull
 * @return {OrientArray}
 * @public
 */
OrientArray.prototype.remove = OrientArray.prototype.pull;

///**
// * Save sub-documents
// *
// * @return {OrientArray}
// * @public
// */
//OrientArray.prototype.$__save = mixins.save();

module.exports = OrientArray;