var utils = require('../../utils');

/**
 * @return {Function}
 */
exports.markModified = function () {
  return function (elem, embeddedPath) {
    var parent = this._parent
      , dirtyPath;

    if (parent) {
      dirtyPath = this._path;

      if (arguments.length) {
        if (null !== embeddedPath && undefined !== embeddedPath) {
          // an embedded doc bubbled up the change
          dirtyPath = dirtyPath + '.' + this.indexOf(elem) + '.' + embeddedPath;
        } else {
          // directly set an index
          dirtyPath = dirtyPath + '.' + elem;
        }
      }
      parent.markModified(dirtyPath);
    }

    return this;
  }
};

/**
 *
 * @param {OrientContainer} self
 * @param {Boolean} init
 * @return {Function}
 */
exports.castWrapper = function (self, init) {
  init = !!init;
  return function (value, id, array) {
    return self._cast(value, id, array, init);
  };
};

/**
 * @return {Function}
 */
exports.getAtomics = function () {
  return function () {
    var ret = [];
    var keys = Object.keys(this._atomics);
    var i = keys.length;

    if (0 === i) {
      ret[0] = ['$set', this.toObject({ depopulate: 1 })];
      return ret;
    }

    while (i--) {
      var op = keys[i];
      var val = this._atomics[op];

      if (utils.isOrientObject(val)) {
        val = val.toObject({ depopulate: 1 });
      }
      else if (val.valueOf) {
        val = val.valueOf();
      }

      ret.push([op, val]);
    }
    return ret;
  }
};

/**
 * @return {Function}
 */
exports.hasAtomics = function () {
  return function () {
    if (!(this._atomics && 'Object' === this._atomics.constructor.name)) {
      return 0;
    }

    return Object.keys(this._atomics).length;
  }
};

/**
 * @return {Function}
 */
exports.fullPath = function () {
  return function (path) {
    var fullPath = this._parent.$__fullPath(this._path);

    return path
      ? fullPath + '.' + path
      : fullPath;
  }
};

///**
// * @return {Function}
// */
//exports.save = function () {
//  return function (doc, next) {
//    var error = false;
//
//    this.forEach(function (item) {
//      if (error) return;
//      if (utils.isDocument(item)) item.save(handleSave);
//    }, this);
//
//    return this;
//
//    function handleSave (err) {
//      if (error) return;
//
//      if (err) {
//        doc.$__.validationError = undefined;
//        return next(error = err);
//      }
//    }
//  }
//};

/**
 * @return {Function}
 */
exports.reset = function () {
  return function () {
    this.forEach(function (doc) {
      if (utils.isDocument(doc)) doc.$__reset();
    }, this);

    return this;
  }
};

/**
 * @return {Function}
 */
exports.notify = function () {
  return function (event) {
    var self = this;
    return function notify (val) {
      self.forEach(function (doc) {
        if (utils.isDocument(doc)) doc.emit(event, val);
      }, self);
    }
  }
};

exports.create = function () {
  return function (obj) {
    return this._schema.getEntry().cast(obj);
  }
};