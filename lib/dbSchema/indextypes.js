/**
 * Available Orient DB index types
 * @see https://github.com/orientechnologies/orientdb/wiki/Indexes
 * @type {Object}
 */
exports = module.exports = {
  // SB-Tree
  Unique: 'UNIQUE',
  NotUnique: 'NOTUNIQUE',
  FullText: 'FULLTEXT',
  Disctionary: 'DICTIONARY',

  // HashIndex
  HashUnique: 'UNIQUE_HASH_INDEX',
  HashNotUnique: 'NOTUNIQUE_HASH_INDEX',
  HashFullText: 'FULLTEXT_HASH_INDEX',
  HashDisctionary: 'DICTIONARY_HASH_INDEX'
};