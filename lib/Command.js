var Sql = require('./Sql')
  , utils = require('./utils')
  , Promise = require('bluebird')
  , connections = require('./ConnectionCache')
  , Statement = require('./query/statements/Statement');

/**
 * @param {String} connection
 * @param {String|SqlContainer} [sql]
 * @constructor
 */
function Command (connection, sql) {
  this.connectionName = connection;
  this.sqls = [];
  if (sql) {
    this.addSql(sql);
  }
};

/**
 * @type {String}
 * @private
 */
Command.prototype.connectionName;

/**
 * @type {Db}
 * @private
 */
Command.prototype.odo;

/**
 * @type {Sql[]|Statement[]}
 * @private
 */
Command.prototype.sqls;

/**
 * Get connection
 *
 * @return {Connection}
 * @public
 */
Command.prototype.db = function () {
  return connections.get(this.connectionName);
};

/**
 * @param {String|Array|SqlContainer} sql
 * @param {Object} [options]
 *
 * @return {Command}
 * @public
 */
Command.prototype.addSql = function (sql, options) {
  var self = this;
  if (sql instanceof Sql || sql instanceof Statement) {
    this.sqls.push(sql);
  }
  else if (utils.isArray(sql)) {
    sql.forEach(function(item) {
      var query, opts;
      if (utils.isArray(item)) {
        query = item[0];
        opts = item[1];
      }
      else if (utils.isString(item)) {
        query = item;
      }
      else return;

      self.sqls.push(new Sql(query, opts));
    });
  }
  else {
    this.sqls.push(new Sql(sql, options));
  }
  return this;
};

/**
 * @param {String|Array|SqlContainer} sql
 * @param {Object} [params]
 *
 * @return {Command}
 * @public
 */
Command.prototype.setSql = function (sql, params) {
  return this.clearSql().addSql(sql, params);
};

/**
 * Clear sql queue
 *
 * @return {Command}
 */
Command.prototype.clearSql = function () {
  this.sqls = [];
  return this;
};

/**
 * @param {Object} values
 * @param {Number} [id] Number of sql to bind values
 *
 * @return {Command}
 * @public
 */
Command.prototype.bindValues = function (values, id) {
  if (!values) return this;

  var self = this;
  Object.keys(values).forEach(function (name) {
    self.bindValue(name, values[name], id);
  });

  return this;
};

/**
 * Binds a value to a parameter.
 * @param {String} name
 * @param {*} value
 * @param {Number} [id] Number of sql to bind values
 *
 * @return {Command}
 * @public
 */
Command.prototype.bindValue = function (name, value, id) {
  id = id || 0;
  if (this.sqls[id]) {
    this.sqls[id].params(name, value);
  }

  return this;
};

/**
 * @param {Object} options
 * @param {Number} [id] Number of sql to bind values
 *
 * @return {Command}
 * @public
 */
Command.prototype.setOptions = function (options, id) {
  if (!options || !this.sqls[id]) return this;
  this.sqls[id].setOptions(options);
  return this;
};

/**
 * Prepares the SQL statement to be executed.
 * For complex SQL statement that is to be executed multiple times,
 * this may improve performance.
 *
 * @return {Promise}
 */
Command.prototype.prepare = function () {
  if (this.odo) return Promise.resolve(this.odo);

  var self = this;
  return this.db().rawDb().then(function (db) {
    return self.odo = db;
  });
};

/**
 * Executes the SQL statements in queue starting from id.
 * This method should only be used for executing non-query SQL statement, such as `INSERT`, `DELETE`, `UPDATE` SQLs.
 * @param {Object} [options]
 * @param {Number} [id]
 *
 * @return {Promise}
 */
Command.prototype.execute = function (options, id) {
  id = id || 0;
  var self = this;
  if (!this.sqls[id]) return Promise.resolve(true);

  return this.prepare().then(function () {
    return self.sqls[id].toSql();
  }).then(function (sql) {
    if (!sql) return true;
    options = options || {};
    utils.merge(sql.options, options);
    return self.odo.exec(sql.query, sql.options).then(function () {
      return self.execute(options, id+1);
    });
  });
};

/**
 * Performs the actual DB query
 * @param {Object} [options]
 * @param {Boolean} [one]
 *
 * @return {Promise}
 * @protected
 */
Command.prototype.queryInternal = function (options, one) {
  options = options || {};
  var self = this
    , sql;

  if (!this.sqls[0]) {
    console.error("Command.queryInternal(): No SQL to be executed");
    return Promise.resolve(undefined);
  }

  return this.sqls[0].toSql().then(function (pSql) {
    // store sql for future use
    sql = pSql;
    return self.prepare();
  }).then(function () {
    utils.merge(sql.options, options);
    return self.odo.query(sql.query, sql.options);
  }).then(function (results) {
    // this helps to prevent applying transforms to all returned documents!!
    if (one && results && results[0]) {
      return [results[0]];
    }
    return results;
  }).then(function (results) {
    return self._processTransforms(results, sql.options.transforms);
  });
};

/**
 * @param {Array} results
 * @param {Array} transforms
 *
 * @return {Object[]}
 * @private
 */
Command.prototype._processTransforms = function (results, transforms) {
  if (!(transforms && transforms.length)) return results;

  return results.map(function (result) {
    return transforms.reduce(function (result, transformer) {
      if (typeof transformer === 'function') {
        return transformer(result);
      }
      var keys = Object.keys(transformer),
        total = keys.length,
        key, i;
      for (i = 0; i < total; i++) {
        key = keys[i];
        if (result[key] !== undefined) {
          result[key] = transformer[key](result[key]);
        }
      }
      return result;
    }, result);
  });
};

/**
 * Execute a query with result
 * @param {Object} [options]
 *
 * @return {Promise}
 * @promise {Object[]}
 * @public
 */
Command.prototype.query = function (options) {
  return this.queryInternal(options);
};

/**
 * Query all records
 * @param {Object} [options]
 *
 * @return {Promise}
 * @promise {Object[]}
 * @public
 */
Command.prototype.all = function (options) {
  return this.queryInternal(options);
};

/**
 * Query one record
 * @param {Object} [options]
 *
 * @return {Promise}
 * @promise {Object}
 * @public
 */
Command.prototype.one = function (options) {
  return this.queryInternal(options, true).then(function (items) {
    return items[0] ? items[0] : null;
  });
};

/**
 * Executes the SQL statement and returns the value of the first column in the first row of data.
 * @param {Object} [options]
 *
 * @return {Promise}
 * @promise {*}
 * @public
 */
Command.prototype.scalar = function (options) {
  return this.queryInternal(options).then(function (response) {
    response = response[0];
    var key;
    if (response && utils.isObject(response)) {
      key = Object.keys(response).filter(function (item) {
        return item[0] !== '@';
      })[0];
      if (key) {
        return response[key];
      }
    }
    return response;
  });
};

/**
 * Executes the SQL statement and returns the first column of the result.
 * This method is best used when only the first column of result (i.e. the first element in each row)
 * is needed for a query.
 * @param {String} [name] Column name to return (path name)
 * @param {Object} [options]
 *
 * @return {Promise}
 * @promise {*[]}
 * @public
 */
Command.prototype.column = function (name, options) {
  return this.queryInternal(options).then(function (response) {
    if (!response) return [];
    var key = name || null;
    return response.map(function (item) {
      if (item && utils.isObject(item)) {
        key = key || Object.keys(item).filter(function (field) {
          return field[0] !== '@';
        })[0];
        if (key) {
          return item[key];
        }
      }
      return undefined;
    });
  });
};

/**
 * @param {String} className
 * @param {Object} [options]
 * @param {Object} [paths]
 * @param {Object} [indexes]
 *
 * @return {Command}
 * @public
 */
Command.prototype.createClass = function (className, options, paths, indexes) {
  var sql = this.db().queryBuilder().createClass(className, options, paths, indexes);
  return this.setSql(sql);
};

/**
 * @param {String} className
 * @param {String|Object} attribute
 * @param {*} [value]
 *
 * @return {Command}
 * @public
 */
Command.prototype.alterClass = function (className, attribute, value) {
  var sql = this.db().queryBuilder().alterClass(className, attribute, value);
  return this.setSql(sql);
};

/**
 * @param {String} className
 * @param {String} newName
 *
 * @return {Command}
 * @public
 */
Command.prototype.renameClass = function (className, newName) {
  var sql = this.db().queryBuilder().alterClass(className, {name: newName});
  return this.setSql(sql);
};

/**
 * @param {String} className
 *
 * @return {Command}
 * @public
 */
Command.prototype.dropClass = function (className) {
  var sql = this.db().queryBuilder().dropClass(className);
  return this.setSql(sql);
};

/**
 * @param {String} className
 *
 * @return {Command}
 * @public
 */
Command.prototype.truncateClass = function (className) {
  var sql = this.db().queryBuilder().truncateClass(className);
  return this.setSql(sql);
};

/**
 * @param {String} className
 * @param {String} pName
 * @param {String|Object} options
 *
 * @return {Command}
 * @public
 */
Command.prototype.createProperty = function (className, pName, options) {
  var sql = this.db().queryBuilder().createProperty(className, pName, options);
  return this.setSql(sql);
};

/**
 * @param {String} className
 * @param {String} pName
 * @param {String|Object} attribute
 * @param {*} [value]
 *
 * @return {Command}
 * @public
 */
Command.prototype.alterProperty = function (className, pName, attribute, value) {
  var sql = this.db().queryBuilder().alterProperty(className, pName, attribute, value);
  return this.setSql(sql);
};

/**
 * @param {String} className
 * @param {String} pName
 * @param {String} newName
 *
 * @return {Command}
 * @public
 */
Command.prototype.renameProperty = function (className, pName, newName) {
  var sql = this.db().queryBuilder().alterProperty(className, pName, {name: newName});
  return this.setSql(sql);
};

/**
 * @param {String} className
 * @param {String} pName
 *
 * @return {Command}
 * @public
 */
Command.prototype.dropProperty = function (className, pName) {
  var sql = this.db().queryBuilder().dropProperty(className, pName);
  return this.setSql(sql);
};

/**
 * @param {String} iName
 * @param {String} type
 * @param {String} [className]
 * @param {Array|String} [paths]
 * @param {Object} [metadata]
 *
 * @return {Command}
 * @public
 */
Command.prototype.createIndex = function (iName, type, className, paths, metadata) {
  var sql = this.db().queryBuilder().createIndex(iName, type, className, paths, metadata);
  return this.setSql(sql);
};

/**
 * @param {String} iName
 * @param {String} [className]
 *
 * @return {Command}
 * @public
 */
Command.prototype.dropIndex = function (iName, className) {
  var sql = this.db().queryBuilder().dropIndex(iName, className);
  return this.setSql(sql);
};

/**
 * @param {String} iName
 * @param {String} [className]
 *
 * @return {Command}
 * @public
 */
Command.prototype.rebuildIndex = function (iName, className) {
  var sql = this.db().queryBuilder().rebuildIndex(iName, className);
  return this.setSql(sql);
};

/**
 * Insert record
 * @param {String} cName
 * @param {Object} obj
 * @param {Object} [options]
 *
 * @return {Command}
 * @public
 */
Command.prototype.insert = function (cName, obj, options) {
  return this.setSql(this.db().queryBuilder().insert(cName, obj, options));
};

/**
 * Update record
 * @param {String} cName
 * @param {Object} conditions
 * @param {Object} delta
 * @param {Object} [options]
 *
 * @return {Command}
 * @public
 */
Command.prototype.update = function (cName, conditions, delta, options) {
  return this.setSql(this.db().queryBuilder().update(cName, conditions, delta, options));
};

/**
 * Remove records
 * @param {String|Schema} cName
 * @param {Object} [conditions]
 * @param {Object} [options]
 *
 * @return {Command}
 * @public
 */
Command.prototype.delete = function (cName, conditions, options) {
  return this.setSql(this.db().queryBuilder().delete(cName, conditions, options));
};

/**
 * Find records
 * @param {String|Schema} cName
 * @param {Object} [conditions]
 * @param {String|String[]} [fields]
 * @param {Object} [options]
 *
 * @return {Command}
 * @public
 */
Command.prototype.select = function (cName, conditions, fields, options) {
  return this.setSql(this.db().queryBuilder().select(cName, conditions, fields, options));
};

module.exports = Command;