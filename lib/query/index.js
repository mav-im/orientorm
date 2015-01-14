var Criteria = require('./Criteria')
  , statements = require('./statements')
  , utils = require('../utils')
  , connections = require('../ConnectionCache');

/**
 * Query provides a set of methods QueryStates to facilitate the specification of different clauses
 * in a SQL statement. These methods can be chained together.
 *
 * @constructor
 */
function Query () {};

/**
 * @type {String}
 * @private
 */
Query.prototype.connectionName;

/**
 * Current mode (insert|select|update|delete|traverse)
 * @type {Statement}
 * @protected
 */
Query.prototype.statement;

/**
 * Set/Get db connection
 * @param {Connection|String} [connection] Connection instance or connection name
 *
 * @return {Query|Connection|undefined}
 * @public
 */
Query.prototype.db = function (connection) {
  if (connection) {
    this.connectionName = utils.isString(connection) ? connection : connection.name;
    return this;
  }

  return this.connectionName ? connections.get(this.connectionName) : undefined;
};

/**
 * @return {Query}
 * @public
 */
Query.prototype.newQuery = function () {
  return (new Query()).db(this.connectionName);
};

/**
 * Check whether query has state and throws a error in such case
 * @throws {Error}
 */
Query.prototype.checkStatement = function () {
  if (this.statement) throw new Error ("Query has statement already. Use subquery instead");
};

/**
 * Starts SELECT statement for the query
 * @param {String|String[]} [projections] Projections {https://github.com/orientechnologies/orientdb/wiki/SQL-Query#projections}
 *
 * @return {StatementSelect}
 * @public
 */
Query.prototype.select = function (projections) {
  this.checkStatement();
  return this.statement = new statements['select'](this, projections);
};

/**
 * Starts TRAVERSE statement for the query
 * @param {String|String[]} [fields] Fields to traverse  {https://github.com/orientechnologies/orientdb/wiki/SQL-Traverse#fields}
 *
 * @return {StatementTraverse}
 * @public
 */
Query.prototype.traverse = function (fields) {
  this.checkStatement();
  return this.statement = new statements['traverse'](this, fields);
};

/**
 * Starts DELETE statement for the query
 *
 * @return {StatementDelete}
 * @public
 */
Query.prototype.delete = function () {
  this.checkStatement();
  return this.statement = new statements['delete'](this);
};

/**
 * Starts INSERT statement for the query
 *
 * @return {StatementInsert}
 * @public
 */
Query.prototype.insert = function () {
  this.checkStatement();
  return this.statement = new statements['insert'](this);
};

/**
 * Starts UPDATE statement for the query
 * @param {String|String[]} target (<class> | cluster:<cluster> | <recordID>)
 *
 * @return {StatementUpdate}
 * @public
 */
Query.prototype.update = function (target) {
  this.checkStatement();
  return this.statement = new statements['update'](this, target);
};

module.exports = Query;