var Promise = require('bluebird');

/**
 * @param {String} query
 * @param {Object} [options]
 *
 * @constructor
 * @implements {SqlContainer}
 */
function Sql (query, options) {
  this.query = query;
  this.options = options || {};
  this.options.params = this.options.params || {};
};

/**
 * @type {String}
 * @public
 */
Sql.prototype.query;

/**
 * @type {Object}
 * @public
 */
Sql.prototype.options;

/**
 * Adds additional parameters to be bound to the query.
 * @param {String|Object} name
 * @param {*} [value]
 *
 * @return {Sql}
 * @public
 */
Sql.prototype.params = function (name, value) {
  if (!name) return this;
  if ('string' !== typeof name) {
    for (var i in name) {
      if (!name.hasOwnProperty(i)) continue;
      this.params(i, name[i]);
    }
    return this;
  }
  this.options.params[name] = value;
  return this;
};

/**
 * Set options
 * @param {String|Object} name
 * @param {*} [value]
 *
 * @return {Sql}
 * @public
 */
Sql.prototype.setOptions = function (name, value) {
  if (!name) return this;

  if ('string' !== typeof name) {
    for (var i in name) {
      if (!name.hasOwnProperty(i)) continue;
      this.setOptions(i, name[i]);
    }
    return this;
  }

  this.options[name] = value;
  return this;
};

/**
 * For common interface with Statement
 *
 * @return {Promise}
 * @promise {Sql}
 * @public
 */
Sql.prototype.toSql = function () {
  return Promise.resolve(this);
};

module.exports = Sql;