/************ OFunction ************/
exports.OFunctionSchema = {
  code: 'String',
  idempotent: 'Boolean',
  language: 'String',
  name: 'String',
  parameters: ['String'],

  $name: 'OFunction'
};

/************ OIdentity ************/
exports.OIdentitySchema = {
  $name: 'OIdentity',
  $abstract: true
};

/************ ORIDs ************/
exports.ORIDsSchema = {
  $name: 'ORIDs'
};

/************ ORestricted ************/
exports.ORestrictedSchema = {
  _allow: {$type: 'LinkSet', $class: 'OIdentity'},
  _allowDelete: {$type: 'LinkSet', $class: 'OIdentity'},
  _allowRead: {$type: 'LinkSet', $class: 'OIdentity'},
  _allowUpdate: {$type: 'LinkSet', $class: 'OIdentity'},

  $name: 'ORestricted',
  $abstract: true
};

/************ ORole ************/
exports.ORoleSchema = {
  inheritedRole: {$link: true, $class: 'ORole'},
  mode: 'Byte',
  name: {$type: 'String', $required: true, $notNull: true, $collate: 'ci'},
  rules: 'EmbeddedMap',

  $name: 'ORole',
  $extends: 'OIdentity',
  $indexes: {
    name: {
      type: 'Unique',
      paths: ['name']
    }
  }
};

/************ OSchedule ************/
exports.OScheduleSchema = {
  arguments: 'EmbeddedMap',
  function: {$link: true, $class: 'OFunction', $required: true, $notNull: true},
  name: {$type: 'String', $required: true, $notNull: true},
  rule: {$type: 'String', $required: true, $notNull: true},
  start: 'Boolean',
  starttime: 'DateTime',
  status: 'String',

  $name: 'OSchedule'
};

/************ OTriggered ************/
exports.OTriggeredSchema = {
  $name: 'OTriggered',
  $abstract: true
};

/************ OUser ************/
exports.OUserSchema = {
  name: {$type: 'String', $required: true, $notNull: true, $collate: 'ci'},
  password: {$type: 'String', $required: true, $notNull: true},
  roles: {$type: 'LinkSet', $class: 'ORole'},
  status: {$type: 'String', $required: true, $notNull: true},

  $name: 'OUser',
  $extends: 'OIdentity',
  $indexes: {
    name: {
      type: 'Unique',
      paths: ['name']
    }
  }
};

/************ E ************/
exports.ESchema = {
  $name: 'E'
};

/************ V ************/
exports.VSchema = {
  $name: 'V'
};