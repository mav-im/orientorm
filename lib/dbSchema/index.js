/**
 * Module dependencies
 */
var utils = require('../utils')
  , QueryBuilder = require('../query/QueryBuilder')
  , Promise = require('bluebird')
  , Schema = require('./Schema')
  , SchemaIndex = require('./SchemaIndex')
  , IndexTypes = require('./indextypes')
  , Containers = require('./containers')
  , Types = require('./types')
  , SchemaType = require('./SchemaType')
  , defaults = require('./schemadefaults')
  , cluster = require('cluster')
  , connections = require('../ConnectionCache');

/**
 * DB connection DbSchema container
 * @param {String} connection Connection name
 * @constructor
 */
function DbSchema (connection) {
  this.connectionName = connection;
  this.initialized = false;
  this.classes = {};
  this.clusters = {};
  this.register(defaults);
};

/**
 * @type {String}
 * @private
 */
DbSchema.prototype.connectionName;

/**
 * @type {Boolean}
 * @public
 */
DbSchema.prototype.initialized;

/**
 * @type {QueryBuilder}
 * @private
 */
DbSchema.prototype.builder;

/**
 * @type {Object} List of DbSchema
 * @private
 */
DbSchema.prototype.classes;

/**
 * @type {Object} List of cluster IDs
 * @private
 */
DbSchema.prototype.clusters;

/**
 * Get Connection
 *
 * @return {Connection}
 * @public
 */
DbSchema.prototype.db = function () {
  return connections.get(this.connectionName);
};

/**
 * Initialize schema
 *
 * @return {Promise}
 * @promise {Boolean}
 * @public
 */
DbSchema.prototype.init = function () {
  if (this.initialized) {
    return Promise.resolve(this.initialized);
  }

  var self = this;
  return this.__checkInit()
    .then(function () {
      return self.getCluster();
    }).then(function () {
      return self.initClasses(self.getClassNames());
    }).then(function (result) {
      if (cluster.isWorker) {
        process.send('orientdb::init::ready');
      }
      return self.initialized = result;
    });
};

/**
 *
 * @return {Promise}
 * @private
 */
DbSchema.prototype.__checkInit = function () {
  // if this is primary process we can initialize in normal way
  if (cluster.isMaster) {
    return Promise.resolve(true);
  }
  // otherwise we should check if another cluster is initializing schema already
  // and wait for it
  else {
    var resolver = Promise.defer();
    // listen for response
    process.on('message', function (msg) {
      switch (msg) {
        case 'orientdb::init::done':
          // if this is the first slave request we can go through
          // OR if initialization was done in another process
          resolver.resolve(true);
          break;

        case 'orientdb::init::error':
          resolver.reject('DbSchema.init(): Error: ' + msg);
          break;
      }
    });

    // send request to master
    process.send('orientdb::init::request');
    return resolver.promise;
  }
};

/**
 * Get registered clusters
 * @param {String|Schema} [cName]
 *
 * @return {Boolean}
 * @public
 */
DbSchema.prototype.hasCluster = function (cName) {
  var name = utils.isString(cName) ? cName : cName.getName();
  return !!this.clusters[name];
};

/**
 * Get registered clusters
 * @param {String|Schema} [cName]
 *
 * @return {Promise}
 * @promise {Number[]}
 * @public
 */
DbSchema.prototype.getCluster = function (cName) {
  var name = null;
  if (cName) name = utils.isString(cName) ? cName : cName.getName();
  if (name && this.clusters[name]) return Promise.resolve(this.clusters[name]);

  var self = this;
  return this.db().rawDb().then(function (db) {
    return db.class.list(true);
  }).then(function (classes) {
    classes.forEach(function (item) {
      self.clusters[item.name] = item.clusterIds;
    });
    return self.clusters;
  }).then(function (clusters) {
    if (!name) return clusters;
    return clusters[name];
  });
};

/**
 * Install classes in DB
 * @param {String[]} classes
 * @param {Number} [id]
 *
 * @return {Promise}
 * @promise {Boolean}
 * @public
 */
DbSchema.prototype.initClasses = function (classes, id) {
  id = id || 0;
  if (!classes.length || !classes[id]) return Promise.resolve(true);

  var self = this;
  return this.getClass(classes[id]).init().then(function (result) {
    if (result) return self.initClasses(classes, id+1);
    return false;
  });
};

DbSchema.prototype.defaults = function () {
  return Object.keys(defaults);
};

/**
 * @return {QueryBuilder}
 */
DbSchema.prototype.queryBuilder = function () {
  if (this.builder == null) {
    this.builder = this.createQueryBuilder();
  }
  return this.builder;
};

/**
 * @return {QueryBuilder}
 * @protected
 */
DbSchema.prototype.createQueryBuilder = function () {
  return new QueryBuilder(this.connectionName);
};

/**
 * Create and Register classes
 * @param {Object[]|Object} schemas
 *
 * @return {DbSchema}
 * @public
 */
DbSchema.prototype.register = function (schemas) {
  var self = this;

  (utils.isArray(schemas) ? schemas : Object.keys(schemas).map(function (key) {
    return schemas[key];
  }))
    .forEach(function (item) {
      self.registerClass(item);
    });
  return this;
};

/**
 * @return {String[]}
 * @public
 */
DbSchema.prototype.getClassNames = function () {
  return Object.keys(this.classes);
};

/**
 * @param {*} schemaClass
 */
DbSchema.prototype.isClass = function (schemaClass) {
  return (schemaClass instanceof Schema);
};

/**
 * Obtains the metadata for the class
 * @param {String|Schema} name
 *
 * @return {Schema}
 * @public
 */
DbSchema.prototype.getClass = function (name) {
  var cName = (name instanceof Schema) ? name.getName() : name;

  if (!this.classes[cName])
    throw new Error("DbSchema.getClass(): Class `" + cName + "` doesn't exist");

  return this.classes[cName];
};

/**
 * Create and register class
 * @param {Object} schema class DbSchema description
 *
 * @return {Schema}
 * @public
 */
DbSchema.prototype.registerClass = function (schema) {
  var name = schema.$name;
  if (!name)
    throw new Error("DbSchema.registerClass(): Class name should be specified");

  if (this.classes[name])
    throw new Error("DbSchema.registerClass(): Can not overwrite class `" + name + "` schema");

  return this.classes[name] = new Schema(this, schema);
};

/**
 * Create virtual class
 * @param {Object} [paths]
 *
 * @return {Schema}
 * @public
 */
DbSchema.prototype.createVirtualClass = function (paths) {
  var schema = {
    $name: null,
    $virtual: true
  };

  utils.mergeObjects(schema, paths || {});
  return new Schema(this, schema);
};

/**
 * Build Index schema
 * @param {String} name
 * @param {SchemaIndex|Object} options
 * @param {String} [cName]
 *
 * @return {SchemaIndex}
 * @public
 */
DbSchema.prototype.buildIndex = function (name, options, cName) {
  if (options instanceof SchemaIndex) {
    options.name(name);
    if (cName) options.class(cName);
    return options;
  }
  options = options || {};
  var type = options.type ? options.type : null;

  if (!type || !IndexTypes[type])
    throw new Error ("DbSchema.buildIndex(): Unsupported index type '" + type + "'");

  var preparedOptions = utils.mergeObjects({}, options);
  if (cName) preparedOptions.class = cName;
  preparedOptions.type = IndexTypes[type];

  return new SchemaIndex(name, preparedOptions);
};

/**
 * Find out and instanciate appropriate path object
 * @param {String} name
 * @param {SchemaType|Object} options
 * @param {Boolean} [linked] Whether this is a linked component
 *
 * @return {SchemaType}
 * @public
 */
DbSchema.prototype.buildComponent = function (name, options, linked) {
  return Schema.interpretAsType(this, name, options, linked);
};

/**
 * @type {Object}
 */
DbSchema.IndexTypes = IndexTypes;

/**
 * @type {Object}
 */
DbSchema.Containers = Containers;

/**
 * @type {Object}
 */
DbSchema.Types = Types;

module.exports = DbSchema;