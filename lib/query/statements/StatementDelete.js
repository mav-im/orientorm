var Statement = require('./Statement')
  , mixins = require('./mixins');

/**
 * Delete statement for the query
 * @see https://github.com/orientechnologies/orientdb/wiki/SQL-Delete
 * @param {Query} query
 *
 * @constructor
 * @extends {Statement}
 */
function StatementDelete (query) {
  Statement.call(this, query, 'delete');
  this.criteria.where = [];
  this.criteria.delete = true;
};

/**
 * @private
 */
StatementDelete.prototype.__proto__ = Statement.prototype;

/**
 * Adds FROM
 * @param {String} target (<Class> | cluster:<cluster> | index:<index>)
 *
 * @return {StatementSelect}
 * @public
 */
StatementDelete.prototype.from = mixins.clause('from', null, true);

/**
 * Adds LOCK
 * @param {String} lock Lock strategy ('default'|'record')
 *
 * @return {StatementDelete}
 * @public
 */
StatementDelete.prototype.lock = mixins.option('lock', 'default', ['record', 'default']);

/**
 * Adds RETURN
 * @param {String} lock Lock strategy ('default'|'record')
 *
 * @return {StatementDelete}
 * @public
 */
StatementDelete.prototype.return = mixins.returnClause(['COUNT', 'BEFORE']);

/**
 * Adds where clause with AND
 * @param {String|Object|Function} property
 * @param {String|*} [operator]
 * @param {*|Function} [value]
 *
 * @return {StatementDelete}
 */
StatementDelete.prototype.where = mixins.whereClause('$and');

/**
 * Adds where clause with OR
 * @param {String|Object|Function} property
 * @param {String|*} [operator]
 * @param {*|Function} [value]
 *
 * @return {StatementDelete}
 */
StatementDelete.prototype.orWhere = mixins.whereClause('$or');

/**
 * Adds raw where clause with AND
 * @param {String} sql
 * @param {Object} [params]
 *
 * @return {StatementDelete}
 */
StatementDelete.prototype.whereRaw = mixins.whereRawClause('$and');

/**
 * Adds raw where clause with OR
 * @param {String} sql
 * @param {Object} [params]
 *
 * @return {StatementDelete}
 */
StatementDelete.prototype.orWhereRaw = mixins.whereRawClause('$or');

/**
 * Adds LIMIT
 * @param {Number} limit Number of records to limit
 *
 * @return {StatementDelete}
 * @public
 */
StatementDelete.prototype.limit = mixins.option('limit');

/**
 * Adds TIMEOUT
 * @param {Number} timeout Timeout value in milliseconds
 *
 * @return {StatementDelete}
 * @public
 */
StatementDelete.prototype.timeout = mixins.option('timeout');

module.exports = StatementDelete;