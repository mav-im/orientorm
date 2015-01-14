/**
 * @constructor
 * @interface
 */
function OrientContainer () {}

/**
 * Returns the full path to this document. If optional `path` is passed, it is appended to the full path.
 * @param {String|Number} [path]
 *
 * @return {String}
 * @public
 */
OrientContainer.prototype.$__fullPath = function (path) {};

/**
 * Get number of items
 *
 * @return {Number}
 * @public
 */
OrientContainer.prototype.count = function () {};

/**
 * Return the index of object
 * @param {*} obj The item to look for
 *
 * @return {String|Number}
 * @public
 */
OrientContainer.prototype.indexOf = function (obj) {};

/**
 * Marks this container as modified.
 *
 * If it bubbles up from an embedded document change, then it takes the following arguments (otherwise, takes 0 arguments)
 *
 * @param {Doc} [elem] the embedded doc that invoked this method on the Array
 * @param {String} [embeddedPath] the path which changed in the embeddedDoc
 *
 * @return {OrientContainer}
 * @public
 */
OrientContainer.prototype.$__markModified = function (elem, embeddedPath) {};

/**
 * Register an atomic operation with the parent.
 *
 * @param {String} op operation
 * @param {*} val
 *
 * @return {OrientArray}
 * @public
 */
OrientContainer.prototype.$__registerAtomic = function (op, val) {};

/**
 * Depopulates stored atomic operation values as necessary for direct insertion to OrientDB.
 *
 * If no atomics exist, we return all array values after conversion.
 *
 * @return {Array}
 * @public
 */
OrientContainer.prototype.$__getAtomics = function () {};

/**
 * Returns the number of pending atomic operations to send to the db for this container.
 *
 * @return {Number}
 * @public
 */
OrientContainer.prototype.$__hasAtomics = function () {};

/**
 * Returns a native js Array.
 * @param {Object} options
 *
 * @return {Object}
 * @public
 */
OrientContainer.prototype.toObject = function (options) {};

/**
 * Helper for console.log
 *
 * @return {String}
 * @public
 */
OrientContainer.prototype.inspect = function () {};

/**
 * Resets the internal modified state of subdocuments.
 *
 * @return {OrientContainer}
 * @public
 */
OrientContainer.prototype.$__reset = function () {};

/**
 * Create an instance of schema entry
 * @param {*} obj
 *
 * @return {*}
 * @public
 */
OrientContainer.prototype.create = function (obj) {};

///**
// * Save sub-documents
// * @param {Doc} doc
// * @param {Function} next
// *
// * @return {OrientContainer}
// * @public
// */
//OrientContainer.prototype.$__save = function (doc, next) {};

module.exports.OrientContainer = OrientContainer;