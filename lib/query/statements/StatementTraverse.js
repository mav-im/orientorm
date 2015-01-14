var Statement = require('./Statement')
  , mixins = require('./mixins');

/**
 * Traverse statement for the query
 * @see https://github.com/orientechnologies/orientdb/wiki/SQL-Traverse
 * @param {Query} query
 * @param {String|String[]} [fields] Fields to traverse  {https://github.com/orientechnologies/orientdb/wiki/SQL-Traverse#fields}
 *
 * @constructor
 * @extends {Statement}
 */
function StatementTraverse (query, fields) {
  Statement.call(this, query, 'traverse');
  this.criteria.where = [];
  this.traverse(fields);
};

/**
 * @private
 */
StatementTraverse.prototype.__proto__ = Statement.prototype;

/**
 * Sets the TRAVERSE part of the query.
 * @param {String|String[]} [fields] Fields to traverse  {https://github.com/orientechnologies/orientdb/wiki/SQL-Traverse#fields}
 *
 * @return {StatementTraverse}
 * @public
 */
StatementTraverse.prototype.traverse = mixins.clause('traverse', '*');

/**
 * Adds FROM
 * @param {String|Array|Statement|Function} target
 * Use a Query object to represent a sub-query. In this case, the corresponding array key will be used
 * as the alias for the sub-query.
 *
 * @return {StatementTraverse}
 * @public
 */
StatementTraverse.prototype.from = mixins.clause('from', null, true);

/**
 * Assign a value to a variable within an SQL statement.
 * @param {String|Object} name Name of let statement or Set of pairs {name: value}
 * @param {String|Statement|Function} [value]
 * @param {Boolean} [override]
 *
 * @return {StatementTraverse}
 * @public
 */
StatementTraverse.prototype.let = mixins.objectClause('let');

/**
 * Adds while clause with AND
 * @param {String|Object|Function} property
 * @param {String|*} [operator]
 * @param {*|Function} [value]
 *
 * @return {StatementTraverse}
 */
StatementTraverse.prototype.while = mixins.whereClause('$and');

/**
 * Adds while clause with OR
 * @param {String|Object|Function} property
 * @param {String|*} [operator]
 * @param {*|Function} [value]
 *
 * @return {StatementTraverse}
 */
StatementTraverse.prototype.orWhile = mixins.whereClause('$or');

/**
 * Adds raw while clause with AND
 * @param {String} sql
 * @param {Object} [params]
 *
 * @return {StatementTraverse}
 */
StatementTraverse.prototype.whileRaw = mixins.whereRawClause('$and');

/**
 * Adds raw while clause with OR
 * @param {String} sql
 * @param {Object} [params]
 *
 * @return {StatementTraverse}
 */
StatementTraverse.prototype.orWhileRaw = mixins.whereRawClause('$or');

/**
 * Adds LIMIT
 * @param {Number} limit Number of records to limit
 *
 * @return {StatementTraverse}
 * @public
 */
StatementTraverse.prototype.limit = mixins.option('limit');

/**
 * Adds STRATEGY
 * @param {String} strategy ('DEPTH_FIRST' | 'BREADTH_FIRST')
 *
 * @return {StatementTraverse}
 * @public
 */
StatementTraverse.prototype.strategy = mixins.option('strategy', 'DEPTH_FIRST', ['DEPTH_FIRST', 'BREADTH_FIRST']);

module.exports = StatementTraverse;