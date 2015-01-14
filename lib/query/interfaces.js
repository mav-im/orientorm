/**
 * @interface
 */
function SqlContainer () {}

/**
 * Adds additional parameters to be bound to the query.
 * @param {String|Object} name
 * @param {*} [value]
 *
 * @return {SqlContainer}
 * @public
 */
SqlContainer.prototype.params = function (name, value) {};

/**
 * Set options
 * @param {String|Object} name
 * @param {*} [value]
 *
 * @return {SqlContainer}
 * @public
 */
SqlContainer.prototype.setOptions = function (name, value) {};

/**
 * @return {Promise}
 * @promise {SqlContainer}
 * @public
 */
SqlContainer.prototype.toSql = function () {};

module.exports.SqlContainer = SqlContainer;