/**
 * Stores connections
 * @constructor
 */
function ConnectionCache () {
  this.connections = {};
};

/**
 * @type {Object}
 * @private
 */
ConnectionCache.prototype.connections;

/**
 * @param {Connection} connection
 */
ConnectionCache.prototype.store = function (connection) {
  if (this.connections[connection.name])
    throw new Error("ConnectionCache.store(): Connection `" + connection.name + "` already exists.");

  return this.connections[connection.name] = connection;
};

/**
 * @param {String} name
 *
 * @return {Connection}
 * @public
 */
ConnectionCache.prototype.get = function (name) {
  if (!this.connections[name])
    throw new Error("ConnectionCache.get(): Connection `" + name + "` doesn't exist.");
  return this.connections[name];
};

module.exports = new ConnectionCache();