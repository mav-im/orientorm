'use strict';

/**
 * Module dependencies.
 */
var Connection = require('./Connection')
  , Sql = require('./Sql')
  , pkg = require('../package.json');

/**
 * The exports object is an instance of Orientorm
 */
module.exports = exports = new Orientorm;

/**
 * Orientorm constructor.
 *
 * The exports object of the `Orientorm` module is an instance of this class.
 * Most apps will only use this one instance.
 * @public
 */
function Orientorm () {
  this.connections = require('./ConnectionCache');
}

/**
 * @type {ConnectionCache}
 * @private
 */
Orientorm.prototype.connections;

/**
 * The Orientorm version
 * @type {String}
 * @public
 */
Orientorm.prototype.version = pkg.version;

/**
 * The orientdb driver Orientorm uses.
 * @public
 */
Orientorm.prototype.oriento = require('oriento');

/**
 * List of error constructors
 * @type {Object}
 */
Orientorm.prototype.Error = require('./error');

/**
 * Creates a Connection instance.
 *
 * Each `connection` instance maps to a single database. This method is helpful when mangaging multiple db connections.
 *
 * @param {String} name Connection name
 * @param {Object} config Connection configuration for the server
 *
 * @return {Connection} the created Server object
 * @public
 */
Orientorm.prototype.createConnection = function (name, config) {
  return this.connections.store(new Connection(name, config));
};

/**
 * Retrieve named connection
 * @param {String} name
 *
 * @return {Connection}
 * @public
 */
Orientorm.prototype.connection = function (name) {
  return this.connections.get(name);
};