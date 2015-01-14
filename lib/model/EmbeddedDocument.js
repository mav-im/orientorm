var Doc = require('./Document')
  , inspect = require('util').inspect;

/**
 * @param {Object} obj
 * @param {OrientArray} parentContainer
 * @param {Doc} [parent]
 * @param {String} [path]
 * @param {Object} [fields]
 *
 * @extends {Doc}
 * @constructor
 */
function EmbeddedDocument (obj, parentContainer, parent, path, fields) {
  if (parentContainer) {
    this._parentContainer = parentContainer;
    this._parent = parentContainer._parent;
  }
  else if (parent) {
    this._parent = parent;
  }

  // name is set only in case of direct subdocumenting
  this._path = path || '';

  Doc.call(this, obj, fields, true);

  var self = this;
  this.on('isNew', function (val) {
    self.isNew = val;
  });
};

/**
 * Inherit from Document
 */
EmbeddedDocument.prototype.__proto__ = Doc.prototype;

/**
 * @type {OrientArray}
 * @public
 */
EmbeddedDocument.prototype._parentContainer;

/**
 * @type {Doc}
 * @public
 */
EmbeddedDocument.prototype._parent;

/**
 * @type {String}
 * @public
 */
EmbeddedDocument.prototype._path;

/**
 * Builds the default doc structure
 * @param {Object} obj
 * @param {Object} [fields]
 * @param {Boolean} [skipId]
 *
 * @return {Object}
 * @protected
 */
EmbeddedDocument.prototype.$__buildDoc = function (obj, fields, skipId) {
  var doc = Doc.prototype.$__buildDoc.call(this, obj, fields, skipId);
  if (!this._parent || !this._parent._parent) {
    // add @type and @class only for first level embedded
    doc['@type'] = 'document';
    if (!this.schema.isVirtual()) {
      doc['@class'] = this.schema.getName();
    }
  }
  return doc;
};

/**
 * Marks the embedded doc modified.
 *
 * ####Example:
 *
 *     var doc = blogpost.comments.id(hexstring);
 *     doc.mixed.type = 'changed';
 *     doc.markModified('mixed.type');
 *
 * @param {String} path the path which changed
 *
 * @public
 */
EmbeddedDocument.prototype.markModified = function (path) {
  this.$__.activePaths.modify(path);
  if (this._parentContainer) {
    if (this.isNew) {
      // Mark the WHOLE parent container as modified
      // if this is a new document (i.e., we are initializing
      // a document),
      this._parentContainer.$__markModified();
    }
    else {
      this._parentContainer.$__markModified(this, path);
    }
  }
  else if (this._parent) {
    path = this._path ? this._path + '.' + path : path;
    // mark modified prefixed with sub-document name if any
    this._parent.markModified(path);
  }
};

/**
 * Returns this sub-documents parent document.
 *
 * @public
 */
EmbeddedDocument.prototype.parent = function () {
  return this._parent;
};

/**
 * Returns this sub-documents parent container.
 * @return {OrientArray|undefined}
 * @public
 */
EmbeddedDocument.prototype.parentContainer = function () {
  return this._parentContainer;
};

/**
 * Used as a stub for [hooks.js](https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3)
 *
 * ####NOTE:
 *
 * _This is a no-op. Does not actually save the doc to the db._
 *
 * @return {EmbeddedDocument} this
 * @public
 */
EmbeddedDocument.prototype.save = function() {
  //if (fn)
  //  fn(null);
  return this;
};

/**
 * Registers an error
 * @param {String} path
 * @param {Error} err
 *
 * @return {EmbeddedDocument} this
 * @public
 */
EmbeddedDocument.prototype.$__error = function (path, err) {
  Doc.prototype.$__error.call(this, path, err);

  if (this._parent) {
    this._parent.$__error(this.$__fullPath(path), err);
  }
  return this;
};

/**
 * Override #update method of parent documents.
 * @private
 */
EmbeddedDocument.prototype.update = function () {
  throw new Error('The #update method is not available on EmbeddedDocuments');
};

/**
 * Helper for console.log
 * @public
 */
EmbeddedDocument.prototype.inspect = function () {
  return inspect(this.toObject());
};

/**
 * Marks a path as invalid, causing validation to fail.
 *
 * @param {String} path the field to invalidate (Local path for sub-document)
 * @param {String|Error} err error which states the reason `path` was invalid
 * @param {*} val
 * @param {Boolean} [first]
 *
 * @return {Boolean}
 * @api public
 */
EmbeddedDocument.prototype.invalidate = function (path, err, val, first) {
  if (!this._parent) {
    var msg = 'Unable to invalidate a subdocument that has not been added to a container.'
    throw new Error(msg);
  }

  var fullPath;
  if (this._parentContainer) {
    fullPath = [this._parentContainer._path, this._parentContainer.indexOf(this), path].join('.');
  }
  else if (this._path) {
    fullPath = [this._path, path].join('.');
  }
  else {
    fullPath = path;
  }

  // sniffing arguments:
  // need to check if user passed a value to keep
  // our error message clean.
  if (2 < arguments.length) {
    this._parent.invalidate(fullPath, err, val);
  } else {
    this._parent.invalidate(fullPath, err);
  }

  if (first)
    this.$__.validationError = this.ownerDocument().$__.validationError;
  return true;
};

/**
 * Returns the top level document of this sub-document.
 * @return {Doc}
 */
EmbeddedDocument.prototype.ownerDocument = function () {
  if (this.$__.ownerDocument) {
    return this.$__.ownerDocument;
  }

  var parent = this._parent;
  if (!parent) return this;

  while (parent._parent) {
    parent = parent._parent;
  }

  return this.$__.ownerDocument = parent;
};

/**
 * Returns the full path to this document. If optional `path` is passed, it is appended to the full path.
 * @param {String} [path]
 *
 * @return {String}
 * @public
 */
EmbeddedDocument.prototype.$__fullPath = function (path) {
  var fullPath;
  if (this._parentContainer) {
    fullPath = this._parentContainer.$__fullPath(this._parentContainer.indexOf(this));
  }
  else if (this._parent) {
    fullPath = this._parent.$__fullPath(this._path);
  }
  else {
    fullPath = this._path;
  }

  return path
    ? fullPath + '.' + path
    : fullPath;
}

module.exports = EmbeddedDocument;