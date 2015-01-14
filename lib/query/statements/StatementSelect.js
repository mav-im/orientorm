var Statement = require('./Statement')
  , mixins = require('./mixins')
  , utils = require('../../utils');

/**
 * Select state for the query
 * @see https://github.com/orientechnologies/orientdb/wiki/SQL-Query
 * @param {Query} query
 * @param {String|String[]} [projections] Projections {https://github.com/orientechnologies/orientdb/wiki/SQL-Query#projections}
 *
 * @constructor
 * @extends {Statement}
 */
function StatementSelect (query, projections) {
  Statement.call(this, query, 'select');
  this.criteria.where = [];
  this.select(projections);
};

/**
 * @private
 */
StatementSelect.prototype.__proto__ = Statement.prototype;

/**
 * Add more projections to the SELECT part of the query.
 * @param {String|String[]} [projections] Projections {https://github.com/orientechnologies/orientdb/wiki/SQL-Query#projections}
 * @param {Boolean} override
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.select = mixins.clause('select', '*');

/**
 * Adds FROM
 * @param {String|Array|Statement|Function} target
 * Use a Query object to represent a sub-query. In this case, the corresponding array key will be used
 * as the alias for the sub-query.
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.from = mixins.clause('from', null, true);

/**
 * Assign a value to a variable within an SQL statement.
 * @param {String|Object} name Name of let statement or Set of pairs {name: value}
 * @param {String|Statement|Function} [value]
 * @param {Boolean} [override]
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.let = mixins.objectClause('let');

/**
 * Adds where clause OR group.
 *
 * #Examples:
 *
 *    query.select(['name', 'age']).from('User').or({age: [{$lt: 19}, {$gt: 28}]});
 *
 *    resulted in SQL:
 *    {
 *      query: 'SELECT name, age FROM User WHERE (age < :qp0 OR age > :qp1)',
 *      options: { params: { qp0: 19, qp1: 28 } }
 *    }
 *
 *    // the same result with path provided first
 *    query.select(['name', 'age']).from('User').or('age', [{$lt: 19}, {$gt: 28}]);
 *
 *    // with another condition
 *    query.select(['name', 'age']).from('User').where({name: 'Joe'}).or({age: [{$lt: 19}, {$gt: 28}]});
 *
 *    resulted in SQL:
 *    {
 *      query: 'SELECT name, age FROM User WHERE name = :qp0 AND (age < :qp1 OR age > :qp2)',
 *      options: { params: { qp0: 'Joe', qp1: 19, qp2: 28 } }
 *    }
 *
 *    // the same result with where():
 *    query.select(['name', 'age']).from('User').where({
 *      name: 'Joe',
 *      $or: {age: [{$lt: 19}, {$gt: 28}]}
 *    });
 *
 *    // and the same result:
 *    query.select(['name', 'age']).from('User').where({
 *      name: 'Joe',
 *      age: {$or: [{$lt: 19}, {$gt: 28}]}
 *    });
 *
 *    so we get OR group isolated in brackets and joined to other WHERE part with AND
 *
 * @param {String|*} path
 * @param {Array|*} [condition]
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.or = mixins.logicWhereClause('$or');

StatementSelect.prototype.and = mixins.logicWhereClause('$and');

/**
 * Adds where clause with AND
 * @param {String|Object|Function} property
 * @param {String|*} [operator]
 * @param {*|Function} [value]
 *
 * @return {StatementSelect}
 */
StatementSelect.prototype.where = mixins.whereClause('$and');

/**
 * Adds where clause with OR
 * @param {String|Object|Function} property
 * @param {String|*} [operator]
 * @param {*|Function} [value]
 *
 * @return {StatementSelect}
 */
StatementSelect.prototype.orWhere = mixins.whereClause('$or');

/**
 * Adds raw where clause with AND
 * @param {String} sql
 * @param {Object} [params]
 *
 * @return {StatementSelect}
 */
StatementSelect.prototype.whereRaw = mixins.whereRawClause('$and');

/**
 * Adds raw where clause with OR
 * @param {String} sql
 * @param {Object} [params]
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.orWhereRaw = mixins.whereRawClause('$or');

/**
 * Group by one or more columns.
 * @param  {String|String[]} args The columns or expressions to group by.
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.group = mixins.clause('group');

/**
 * Order by one or more columns.
 * @param  {String} property The property or expressions to order by.
 * @param {String} [direction]
 *
 * @return {StatementSelect}            The statement object.
 * @public
 */
StatementSelect.prototype.order = function (property, direction) {
  this.criteria.order = this.criteria.order || [];
  direction = (direction || 'ASC').toUpperCase();
  direction = (direction == 'ASC' || direction == 'DESC') ? direction : 'ASC';

  this.criteria.order.push({
    property: property,
    direction: direction
  });

  return this;
};

/**
 * Adds SKIP
 * @param {Number} skip Number of records to skip
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.skip = mixins.option('skip');

/**
 * Adds LIMIT
 * @param {Number} limit Number of records to limit
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.limit = mixins.option('limit');

/**
 * Specify the fetch plan for the statement.
 * @param {Object} fetchPlan
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.fetch = mixins.clause('fetchPlan');

/**
 * Adds TIMEOUT
 * @param {Number} timeout Timeout value in milliseconds
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.timeout = mixins.option('timeout');

/**
 * Adds LOCK
 * @param {String} lock Lock strategy ('default'|'record')
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.lock = mixins.option('lock', 'default', ['record', 'default']);

/**
 * Adds PARALLEL
 * @param {Boolean} parallel
 *
 * @return {StatementSelect}
 * @public
 */
StatementSelect.prototype.parallel = mixins.option('parallel', true, [true, false]);

module.exports = StatementSelect;