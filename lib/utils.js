var sliced = require('sliced')
  , mpath = require('mpath')
  , cloneRegExp = require('regexp-clone')
  , strftime = require('strftime')
  , Document
  , OrientArray
  , OrientMap;

/**
 * toString helper
 */
var toString = Object.prototype.toString;

/*!
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @api private
 * @return {Boolean}
 */
var isObject = exports.isObject = function (arg) {
  return arg && '[object Object]' == toString.call(arg);
}

/**
 * @param {*} arg
 * @return {boolean}
 */
exports.isString = function (arg) {
  return typeof arg === 'string';
};

/**
 * @param {*} arg
 * @return {boolean}
 */
exports.isNumber = function (arg) {
  return (typeof arg === 'number' || arg instanceof Number);
};

/**
 * @param {*} arg
 * @return {boolean}
 */
exports.isBoolean = function (arg) {
  return typeof arg === 'boolean';
};

/**
 * @param arg
 * @return {Boolean}
 */
var isArray = exports.isArray = function (arg) {
  return Array.isArray(arg);
};

/**
 * Determines if `arg` is Function
 * @param arg
 * @return {Boolean}
 */
exports.isFunction = function (arg) {
  return arg && '[object Function]' == toString.call(arg);
};

/**
 * Determines if `arg` is RegExp
 * @param arg
 * @return {Boolean}
 */
exports.isRegExp = function (arg) {
  return arg && 'RegExp' === arg.constructor.name
};

/**
 * Determines if `arg` is Date
 * @param arg
 * @return {Boolean}
 */
exports.isDate = function (arg) {
  return arg && (arg instanceof Date);
};

/**
 * Shallow copies defaults into options.
 *
 * @param {Object} defaults
 * @param {Object} options
 * @return {Object} the merged object
 */
exports.options = function (defaults, options) {
  var keys = Object.keys(defaults)
    , i = keys.length
    , k ;

  options = options || {};

  while (i--) {
    k = keys[i];
    if (!(k in options)) {
      options[k] = defaults[k];
    }
  }

  return options;
};

/**
 * Get number of object properties
 * @param {Object} obj
 * @return {Number}
 */
var count = exports.count = function (obj) {
  return Object.keys(obj).length;
};

exports.isEmpty = function (obj) {
  return !count(obj);
};

/*!
 * Returns if `v` is a mongoose object that has a `toObject()` method we can use.
 *
 * This is for compatibility with libs like Date.js which do foolish things to Natives.
 *
 * @param {any} v
 * @api private
 */
var isOrientObject = exports.isOrientObject = function (v) {
  Document || (Document = require('./model/Document'));
  OrientArray || (OrientArray = require('./dbSchema/wrappers').OrientArray);
  OrientMap || (OrientMap = require('./dbSchema/wrappers').OrientMap);

  return  v instanceof Document ||
          v instanceof OrientArray ||
          v instanceof OrientMap;
};

var isOrientContainer = exports.isOrientContainer = function (v) {
  OrientArray || (OrientArray = require('./dbSchema/wrappers').OrientArray);
  OrientMap || (OrientMap = require('./dbSchema/wrappers').OrientMap);

  return v instanceof OrientArray ||
         v instanceof OrientMap;
};

exports.isMap = function (path, schema) {
  if (isObject(path)) {
    OrientMap || (OrientMap = require('./dbSchema/wrappers').OrientMap);
    return path.$map ? path.$map : (path instanceof OrientMap);
  }
  var type = schema.path(path).getType();
  return (type === 'EmbeddedMap' || type === 'LinkMap');
};

/**
 * Determines if `a` and `b` are deep equal.
 *
 * Modified from node/lib/assert.js
 *
 * @param {*} a a value to compare to `b`
 * @param {*} b a value to compare to `a`
 * @return {Boolean}
 */
exports.deepEqual = function deepEqual (a, b) {
  if (a === b) return true;

  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source == b.source &&
    a.ignoreCase == b.ignoreCase &&
    a.multiline == b.multiline &&
    a.global == b.global;
  }

  if (typeof a !== 'object' && typeof b !== 'object')
    return a == b;

  if (a === null || b === null || a === undefined || b === undefined)
    return false

  if (a.prototype !== b.prototype) return false;

  if (a instanceof Number && b instanceof Number) {
    return a.valueOf() === b.valueOf();
  }

  if (isOrientObject(a)) a = a.toObject();
  if (isOrientObject(b)) b = b.toObject();

  try {
    var ka = Object.keys(a)
      , kb = Object.keys(b)
      , key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }

  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;

  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();

  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }

  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
};

/**
 * Return the value of `obj` at the given `path`.
 * @param path
 * @param obj
 * @param [map]
 * @return {*}
 */
exports.getValue = function (path, obj, map) {
  return mpath.get(path, obj, '_doc', map);
};

/**
 * Sets the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {*} val
 * @param {Object} obj
 * @param [map]
 */
exports.setValue = function (path, val, obj, map) {
  mpath.set(path, val, obj, '_doc', map);
};

exports.getSubPath = function (self, path, strict) {
  var subpaths = path.split(/\./)
    , firstPath = subpaths[0]
    , subpath = subpaths.slice(1).join('.')
    , container = self.path(firstPath, strict);

  return container && container.path ? container.path(subpath, strict) : undefined;
};

exports.setSubPath = function (self, path, obj) {
  var subpaths = path.split(/\./)
    , firstPath = subpaths[0]
    , subpath = subpaths.slice(1).join('.')
    , container = self.path(firstPath, true);

  if (!container) {
    // create container
    container = self.path(firstPath, {}).path(firstPath, true);
    if (!container) throw new Error('Can not create container for path `' + path + '`');
  }
  // add subpath to container
  if (container.path)
    container.path(subpath, obj);
  else
    throw new TypeError('Path `' + firstPath + '` of type `' + container.getType() + '` doesn\'t support nested items.');
};

exports.args = sliced;

/**
 *
 * @param obj1
 * @param obj2
 * @return {*}
 */
var mergeObjects = exports.mergeObjects = function (obj1, obj2) {
  Object.keys(obj2).forEach(function (key) {
    obj1[key] = obj2[key];
  });

  return obj1;
};

/**
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */
var merge = exports.merge = function merge (to, from) {
  var keys = Object.keys(from)
    , i = keys.length
    , key

  while (i--) {
    key = keys[i];
    if ('undefined' === typeof to[key]) {
      to[key] = from[key];
    } else {
      if (exports.isObject(from[key])) {
        merge(to[key], from[key]);
      } else {
        to[key] = from[key];
      }
    }
  }
};

/**
 * @param {*} obj
 * @param {Object} [options]
 * @return {*}
 */
var clone = exports.clone = function clone (obj, options) {
  if (obj === undefined || obj === null) return obj;


  if (exports.isArray(obj)) {
    return cloneArray(obj, options);
  }

  if (isOrientObject(obj)) {
    if (options && options.json && 'function' === typeof obj.toJSON) {
      return obj.toJSON(options);
    } else {
      return obj.toObject(options);
    }
  }

  if (obj.constructor) {
    switch (obj.constructor.name) {
      case 'Object':
        return cloneObject(obj, options);
      case 'Date':
        return new obj.constructor(+obj);
      case 'RegExp':
        return cloneRegExp(obj);
      default:
        // ignore
        break;
    }
  }

  //if (obj instanceof ObjectId)
  //  return new ObjectId(obj.id);

  if (!obj.constructor && exports.isObject(obj)) {
    // object created with Object.create(null)
    return cloneObject(obj, options);
  }

  if (obj.valueOf)
    return obj.valueOf();
};

function cloneObject (obj, options) {
  var retainKeyOrder = options && options.retainKeyOrder
    , minimize = options && options.minimize
    , ret = {}
    , hasKeys
    , keys
    , val
    , k
    , i

  if (retainKeyOrder) {
    for (k in obj) {
      val = clone(obj[k], options);

      if (!minimize || ('undefined' !== typeof val)) {
        hasKeys || (hasKeys = true);
        ret[k] = val;
      }
    }
  } else {
    // faster

    keys = Object.keys(obj);
    i = keys.length;

    while (i--) {
      k = keys[i];
      val = clone(obj[k], options);

      if (!minimize || ('undefined' !== typeof val)) {
        if (!hasKeys) hasKeys = true;
        ret[k] = val;
      }
    }
  }

  return minimize
    ? hasKeys && ret
    : ret;
};

function cloneArray (arr, options) {
  var ret = [];
  for (var i = 0, l = arr.length; i < l; i++)
    ret.push(clone(arr[i], options));
  return ret;
};

/**
 * Convert Date object to string "yyyy-MM-dd HH:mm:ss"
 * @return {String}
 */
exports.dateToString = function (value) {
  return strftime('%F %T', value);
};

/**
 * Calculates delta based on update object
 * @param update
 * @return {Object}
 */
exports.deltaUpdate = function (update) {
  var delta = {}
    , op;
  update = update || {};
  Object.keys(update).forEach(function (key) {
    op = key[0] === '$' ? key : '$set';
    delta[op] = delta[op] || {};
    // we have $set operation
    if (op !== key) {
      delta[op][key] = update[key];
    }
    else {
      delta[op] = update[key];
    }
  });

  return delta;
};

exports.handleArray = function handleArray (val, path) {
  if (!isArray(val)) return handleArray.call(this, [val], path);
  var self = this;
  return val.map( function (m) {
    return self.cast(m, path);
  });
};

exports.handleSingle = function (val, path) {
  return this.cast(val, path);
};

exports.handleRegexp = function (val) {
  return val;
};

/**
 * @param {*} val
 * @return {Boolean}
 */
exports.isDocument = function (val) {
  Document || (Document = require('./model/Document'));
  return val instanceof Document;
};