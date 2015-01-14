/**
 * Module dependencies
 */
var Server = require('oriento').Server
  , DbSchema = require('./dbSchema')
  , Command = require('./Command')
  , Query = require('./query')
  , Promise = require('bluebird')
  , utils = require('./utils')
  , Model = require('./model')
  , OverwriteModelError = require('./error').OverwriteModelError
  , MissingSchemaError = require('./error').MissingSchemaError;

/**
 * Connection constructor
 * @param {String} name
 * @param {Object} config
 *  {
 *    server: {
 *      see https://github.com/codemix/oriento#configuring-the-client
 *    },
 *    db: {
 *      see https://github.com/codemix/oriento#using-an-existing-database-with-credentials
 *    }
 *  }
 *
 * @constructor
 */
function Connection (name, config) {
  this.name = name;
  this.config = config;
  this.models = {};
  this._opened = false;
}

/**
 * @type {String}
 * @public
 */
Connection.prototype.name;

/**
 * @type {Db}
 * @private
 */
Connection.prototype.db;

/**
 * @type {Server}
 * @private
 */
Connection.prototype.server;

/**
 * @type {Object}
 * @private
 */
Connection.prototype.config;

/**
 * @type {DbSchema}
 * @private
 */
Connection.prototype._dbSchema;

/**
 * @type {Object}
 * @private
 */
Connection.prototype.models;

function checkConfig (config) {
  if (!config.server) {
    throw new Error ("Connection.open(): Cannot open connection without server configuration.");
  }
  if (!config.db) {
    throw new Error ("Connection.open(): Cannot open connection without server database configuration.");
  }
  if (!config.db.name || !config.db.type) {
    throw new Error ("Connection.open(): Incorrect database configuration.");
  }

  return true;
};

/**
 * Open DB connection

 * @return {Promise}
 * @promise {Boolean} Whether db instanciated
 * @public
 */
Connection.prototype.open = function () {
  if (this._opened) {
    return Promise.resolve(true);
  }

  if (checkConfig(this.config)) {
    var self = this;
    this.server = new Server(this.config.server);
    return this.server.list().then(function (dbs) {
      var database;
      dbs.forEach(function (db) {
        if (db.name === self.config.db.name) {
          database = db;
        }
      });

      return database ? database : self.server.create(self.config.db).then(function (db) {
        console.info('Database "' + self.config.db.name + '" created successfully.');
        return db;
      });
    }).then(function (db) {
      if (db) {
        self.db = self.server.use(self.config.db);
        // to prevent infinite loop we should set it here (before schema initialization)
        self._opened = true;
        return true;
      }
      else {
        throw new Error("Connection.open(): Cannot use database from configuration.");
      }
    }).then(function (result) {
      // initialize db schema
      if (result) {
        return self.dbSchema().init();
      }
      return result;
    });
  }

  return Promise.reject('Connection.open(): Cannot connect to OrientDB database `' + this.name + '`.');
};

/**
 * Close DB connection
 *
 * @return {Connection}
 * @public
 */
Connection.prototype.close = function () {
  if (this.server) {
    var socket = this.server.transport.connection.socket;
    if (socket) {
      socket.removeAllListeners();
      socket.destroy();
    }
    this.server.close();

    this.server = null;
    this.db = null;
    // no need to remove DbSchema,
    // just de-initialize it
    this._dbSchema.initialized = false;
    this._opened = false;
  }
  return this;
};

/**
 * Get DB schema object
 * @return {DbSchema}
 */
Connection.prototype.dbSchema = function () {
  if (!this._dbSchema) {
    this._dbSchema = new DbSchema(this.name);
  }

  return this._dbSchema;
};

/**
 * @return {QueryBuilder}
 */
Connection.prototype.queryBuilder = function () {
  return this.dbSchema().queryBuilder();
};

/**
 * @return {Promise}
 * @promise {Db}
 * @public
 */
Connection.prototype.rawDb = function () {
  var self = this;
  return this.open().then(function () {
    return self.db;
  });
};

/**
 * @param {String|SqlContainer} [sql]
 * @param {Object} [params]
 * @return {Command}
 * @public
 */
Connection.prototype.createCommand = function (sql, params) {
  var command = new Command(this.name, sql);
  return command.bindValues(params);
};

/**
 * Create query
 * @return {Query}
 */
Connection.prototype.createQuery = function () {
  return (new Query()).db(this.name);
};

/**
 * Register class schema
 * @param {String|Object} name DbSchema Class name (to obtain) or description to register
 * @return {Schema}
 * @public
 */
Connection.prototype.schema = function (name) {
  if (utils.isString(name)) {
    return this.dbSchema().getClass(name);
  }
  return this.dbSchema().registerClass(name);
};

/**
 * Define a model or retrieve it
 * @param {String} name
 * @param {Schema|Object} [schema]
 *
 * @return {Model}
 * @public
 */
Connection.prototype.model = function (name, schema) {
  if (this.models[name]) {
    if (this.dbSchema().isClass(schema) && this.models[name].schema !== schema) {
      throw new OverwriteModelError(name);
    }
    return this.models[name];
  }

  if (!schema) {
    schema = this.dbSchema().getClass(name);
    if (!schema) throw new MissingSchemaError(name);
  }
  else if (!this.dbSchema().isClass(schema)) {
    schema = this.dbSchema().registerClass(schema);
  }

  var model = Model.compile(this, name, schema);

  return this.models[name] = model;
};

/**
 * Module exports
 */
module.exports = Connection;