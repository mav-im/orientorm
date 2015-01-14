var Criteria = require('../Criteria')
  , utils = require('../../utils')
  , mixins = require('./mixins')
  , Promise = require('bluebird');

/**
 * Different states have different methods with common "interface"
 * @param {Query} query
 * @param {String} type Query State type
 *
 * @constructor
 * @abstract
 * @implements {SqlContainer}
 */
function Statement (query, type) {
  this.query = query;
  this.type = type;
  this.criteria = new Criteria();
  this.options = {};
  this._command = 'all';
};

/**
 * @type {Query}
 * @protected
 */
Statement.prototype.query;

/**
 * @type {String}
 * @private
 */
Statement.prototype.type;

/**
 * Query parts
 * @type {Criteria}
 * @public
 */
Statement.prototype.criteria;

/**
 * Default method to execute on exec()
 * @type {String}
 * @protected
 */
Statement.prototype._command;

/**
 * Options for execution
 * @type {Object}
 */
Statement.prototype.options;

/**
 * Set query options.
 *
 * Depending on current Statement kind supported options can vary,
 * see documentation for more information (http://www.orientechnologies.com/docs/last/orientdb.wiki/Commands.html).
 *
 * ####Options:
 *
 * - [order]
 * - [skip]
 * - [limit]
 * - [timeout]
 * - [lock]
 * - [parallel]
 * - [return]
 * - [upsert]
 * - [strategy]
 *
 * - [command] Command to execute (default - all)
 * - [select] List of fields to select
 *
 * - [params] Params to bound to the query
 * - [transform] Transformation function
 *
 * - other query options, see [oriento](https://github.com/codemix/oriento) documentation (or code :-))
 *
 * @param {String|Object} name
 * @param {*} [value]
 *
 * @return {Statement}
 * @public
 */
Statement.prototype.setOptions = function (name, value) {
  if (!name) return this;
  if ('string' !== typeof name) {
    for (var i in name) {
      if (!name.hasOwnProperty(i)) continue;
      this.setOptions(i, name[i]);
    }
    return this;
  }

  if (utils.isFunction(this[name])) {
    var args = utils.isArray(value) ? value : [value];
    this[name].apply(this, args);
  }
  else {
    this.options[name] = value;
  }

  return this;
  //
  //if (!(options && utils.isObject(options))) return this;
  //
  //// set arbitrary options
  //var methods = Object.keys(options)
  //  , method;
  //
  //for (var i = 0; i < methods.length; ++i) {
  //  method = methods[i];
  //  // use methods if exist (safer option manipulation)
  //  if (utils.isFunction(this[method])) {
  //    var args = utils.isArray(options[method])
  //      ? options[method]
  //      : [options[method]];
  //    this[method].apply(this, args)
  //  } else {
  //    this.options[method] = options[method];
  //  }
  //}
  //
  //return this;
};

/**
 * Set schema for casting
 * @param {String|Schema} schema
 *
 * @return {Statement}
 * @public
 */
Statement.prototype.setSchema = function (schema) {
  this.schema = this.db().dbSchema().getClass(schema);
  return this;
};

/**
 * Get stored class schema
 *
 * @return {Schema|undefined}
 * @public
 */
Statement.prototype.getSchema = function () {
  return this.schema;
};

/**
 * Get query state type
 * @return {String}
 * @public
 */
Statement.prototype.getType = function () {
  return this.type;
};

/**
 * Set/Get db connection
 * @param {Connection|String} [connection]
 *
 * @return {Statement|Connection}
 * @public
 */
Statement.prototype.db = function (connection) {
  if (connection) {
    this.query.db(connection);
    return this;
  }
  var db = this.query.db();
  if (!db) {
    throw new Error("Statement.db(): No DB connection provided, use Statement.db(name|conection) method to add DB connection first.");
  }
  return db;
};

/**
 * Creates a DB command that can be used to execute this query.
 *
 * @return {Command}
 * @public
 */
Statement.prototype.createCommand = function () {
  return this.db().createCommand(this);
};

/**
 * Compile query statement object to Sql object
 *
 * @return {Promise}
 * @promise {Sql}
 * @public
 */
Statement.prototype.toSql = function () {
  // this can be a resource heavy operation with cast and compile
  // so need to wrap it into Promise and perform with process.nextTick
  var resolver = Promise.defer()
    , self = this;

  process.nextTick(function () {
    var sql = self.db().queryBuilder().compile(self);
    //console.log(sql);
    resolver.resolve(sql);
  });

  return resolver.promise;
};

/**
 * Prepare statement for compile
 * @param {QueryBuilder} builder
 */
Statement.prototype.prepare = function (builder) {
  // nothing to do
};

/**
 * @param {String} cmd Command name to execute
 * @return {Statement}
 * @public
 */
Statement.prototype.command = function (cmd) {
  this._command = cmd || 'all';
  return this;
};

/**
 * Executes the query with stored command and results.
 * @param {Object} [options]
 *
 * @return {Promise}
 * @promise {*}
 * @public
 */
Statement.prototype.exec = function (options) {
  var method = (this._command && utils.isFunction(this[this._command])) ? this._command : 'all'

  return this[method](options).bind(this).then(this._prepareResult);
};

/**
 * Executes the query and returns all results as an array.
 * @param {Object} [options]
 *
 * @return {Promise}
 * @promise {*[]}
 * @public
 */
Statement.prototype.all = function (options) {
  return this.createCommand().all(options);
};

/**
 * Converts the raw query results into the format as specified by this query.
 * This method is internally used to convert the data fetched from database
 * into the format as required by this query.
 * @param {*[]} items
 *
 * @return {*}
 * @private
 */
Statement.prototype._prepareResult = function (items) {
  if (this.options.prepareResult && utils.isFunction(this.options.prepareResult)) {
    return this.options.prepareResult(items);
  }
  return items;
};

/**
 * Executes the query and returns a single row of result.
 * @param {Object} [options]
 *
 * @return {Promise}
 * @promise {*}
 * @public
 */
Statement.prototype.one = function (options) {
  return this.createCommand().one(options);
};


/**
 * Returns the query result as a scalar value.
 * The value returned will be the first column in the first row of the query results.
 * @param {Object} [options]
 *
 * @return {Promise}
 * @promise {*}
 * @public
 */
Statement.prototype.scalar = function (options) {
  return this.createCommand().scalar(options);
};

/**
 * Executes the query and returns the first column of the result.
 * @param {Object} [options]
 *
 * @return {Promise}
 * @promise {*[]}
 * @public
 */
Statement.prototype.column = function (options) {
  return this.createCommand().column(null, options);
};

/**
 * Executes the query and returns the count of objects
 * @param {Object} [options]
 *
 * @return {Promise}
 * @promise {Number}
 * @public
 */
Statement.prototype.count = function (options) {
  return this.createCommand().scalar(options);
};

/**
 * Create new query instance
 *
 * @return {Query}
 * @public
 */
Statement.prototype.newQuery = function () {
  return this.query.newQuery();
};

/**
 * Adds additional parameters to be bound to the query.
 * @param {String|Object} name
 * @param {*} [value]
 *
 * @return {Statement}
 * @public
 */
Statement.prototype.params = function (name, value) {
  if (!name) return this;
  if (utils.isObject(name)) {
    for (var i in name) {
      if (!name.hasOwnProperty(i)) continue;
      this.params(i, name[i]);
    }
    return this;
  }
  this.criteria.params[name] = value;
  return this;
};

/**
 * Transform query result
 * @param {Object|Function} transformer
 *
 * @return {Statement}
 * @public
 */
Statement.prototype.transform = function (transformer) {
  if (!transformer) return this;

  this.options.transforms = this.options.transforms || [];
  transformer = utils.isArray(transformer) ? transformer : [transformer];

  if (!transformer.length) return this;
  this.options.transforms = this.options.transforms.concat(transformer);

  return this;
};

module.exports = Statement;