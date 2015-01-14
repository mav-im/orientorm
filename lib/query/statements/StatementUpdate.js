var Statement = require('./Statement')
  , mixins = require('./mixins');

/**
 * Insert statement for the query
 * @see https://github.com/orientechnologies/orientdb/wiki/SQL-Update
 * @param {Query} query
 * @param {String|String[]} target (<class> | cluster:<cluster> | <recordID>)
 *
 * @constructor
 * @extends {Statement}
 */
function StatementUpdate (query, target) {
  Statement.call(this, query, 'update');
  this.criteria.where = [];
  this.update(target);
};

/**
 * @private
 */
StatementUpdate.prototype.__proto__ = Statement.prototype;

/**
 * Prepare statement for compile
 * @param {QueryBuilder} builder
 */
StatementUpdate.prototype.prepare = function (builder) {
  var clear = ['set', 'increment', 'add', 'remove', 'put']
    , self = this;
  if (this.criteria.content || this.criteria.merge) {
    clear.forEach(function(name) {
      delete self.criteria[name];
    });

    if (this.criteria.content) {
      delete this.criteria.merge;
    }
    else {
      delete this.criteria.content;
    }
  }
};

/**
 * Adds UPDATE
 * @param {String} target (<Class> | cluster:<cluster> | <RecordID>)
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.update = mixins.clause('update', null, true);

/**
 * Adds SET clause
 * @param {String|Object} property Name of property or Set of pairs {property: value}
 * @param {String|Statement|Function} [value]
 * @param {Boolean} [override]
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.set = mixins.changeClause('set');

/**
 * Adds INCREMENT clause
 * @param {String|Object} property Name of property or Set of pairs {property: value}
 * @param {String|Statement|Function} [value]
 * @param {Boolean} [override]
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.increment = mixins.changeClause('increment');

/**
 * Adds ADD clause
 * @param {String|Object} property Name of property or Set of pairs {property: value}
 * @param {String|Statement|Function} [value]
 * @param {Boolean} [override]
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.add = mixins.changeClause('add');

/**
 * Adds REMOVE clause
 * @param {String|Object} property Name of property or Set of pairs {property: value}
 * @param {String|Statement|Function} [value]
 * @param {Boolean} [override]
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.remove = mixins.changeClause('remove');

/**
 * Adds PUT clause
 * @param {String|Object} path Name of property or Set of pairs {property: value}
 * @param {String|Statement|Function} [value]
 * @param {Boolean} [override]
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.put = mixins.changeClause('put');

/**
 * Adds CONTENT clause.
 * It will override all SET | INCREMENT | ADD | REMOVE | PUT clauses.
 * @param {String|Object} property Name of property or Set of pairs {property: value}
 * @param {String|Statement|Function} [value]
 * @param {Boolean} [override]
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.content = mixins.changeClause('content');

/**
 * Adds MERGE clause.
 * It will override all SET | INCREMENT | ADD | REMOVE | PUT clauses.
 * @param {String|Object} property Name of property or Set of pairs {property: value}
 * @param {String|Statement|Function} [value]
 * @param {Boolean} [override]
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.merge = mixins.changeClause('merge');

/**
 * Adds UPSERT option
 * @param {Boolean} upsert
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.upsert = mixins.option('upsert', true, [true, false]);

/**
 * Adds RETURN clause
 * @see 'https://github.com/orientechnologies/orientdb/wiki/SQL-Update#example-11-usage-of-return-keyword'
 * @param {String} returning Returning option (COUNT | BEFORE | AFTER)
 * @param {String} [expression] For use with BEFORE and AFTER
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.return = mixins.returnClause(['COUNT', 'BEFORE', 'AFTER'], ['BEFORE', 'AFTER']);

/**
 * Adds where clause with AND
 * @param {String|Object|Function} property
 * @param {String|*} [operator]
 * @param {*|Function} [value]
 *
 * @return {StatementUpdate}
 */
StatementUpdate.prototype.where = mixins.whereClause('$and');

/**
 * Adds where clause with OR
 * @param {String|Object|Function} property
 * @param {String|*} [operator]
 * @param {*|Function} [value]
 *
 * @return {StatementUpdate}
 */
StatementUpdate.prototype.orWhere = mixins.whereClause('$or');

/**
 * Adds raw where clause with AND
 * @param {String} sql
 * @param {Object} [params]
 *
 * @return {StatementUpdate}
 */
StatementUpdate.prototype.whereRaw = mixins.whereRawClause('$and');

/**
 * Adds raw where clause with OR
 * @param {String} sql
 * @param {Object} [params]
 *
 * @return {StatementUpdate}
 */
StatementUpdate.prototype.orWhereRaw = mixins.whereRawClause('$or');

/**
 * Adds LOCK
 * @param {String} lock Lock strategy ('default'|'record')
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.lock = mixins.option('lock', 'default', ['record', 'default']);

/**
 * Adds LIMIT
 * @param {Number} limit Number of records to limit
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.limit = mixins.option('limit');

/**
 * Adds TIMEOUT
 * @param {Number} timeout Timeout value in milliseconds
 *
 * @return {StatementUpdate}
 * @public
 */
StatementUpdate.prototype.timeout = mixins.option('timeout');

module.exports = StatementUpdate;