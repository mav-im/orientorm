var Statement = require('./Statement')
  , mixins = require('./mixins');

/**
 * Insert statement for the query
 * @see https://github.com/orientechnologies/orientdb/wiki/SQL-Insert
 * @param {Query} query
 *
 * @constructor
 * @extends {Statement}
 */
function StatementInsert (query) {
  Statement.call(this, query, 'insert');
  this.criteria.insert = true;
};

/**
 * @private
 */
StatementInsert.prototype.__proto__ = Statement.prototype;

/**
 * Adds INTO
 * @param {String} target ([class:]<Class> | cluster:<cluster> | index:<index>)
 *
 * @return {StatementInsert}
 * @public
 */
StatementInsert.prototype.into = mixins.clause('into', null, true);

/**
 * Adds SET clause
 * @param {String|Object} property Name of property or Set of pairs {property: value}
 * @param {String|Statement|Function} [value]
 * @param {Boolean} [override]
 *
 * @return {StatementInsert}
 * @public
 */
StatementInsert.prototype.set = mixins.changeClause('set');

/**
 * Adds FROM clause
 * @param {Function|Statement} query In case of function we assume developer wants to build sub-query at place
 *
 * @return {StatementInsert}
 * @public
 */
StatementInsert.prototype.from = mixins.clause('from', null, true);

/**
 * Add RETURN clause
 * @param {String} expression
 *
 * @return {StatementInsert}
 * @public
 */
StatementInsert.prototype.return = mixins.returnClause();

module.exports = StatementInsert;