/**
 * Link
 * @type {Object}
 * @public
 */
exports.Link = {
  // Without Class
  desc0_1: 'Link',
  desc0_2: {
    $type: 'Link'
  },
  desc0_3: {
    $link: true
  },

  // With Class
  desc1_1: {
    $type: 'Link',
    $class: 'linkedClass'
  },
  desc1_2: {
    $link: true,
    $class: 'linkedClass'
  }
};

/**
 * Link List - Ordered list of links
 * @type {Object}
 */
exports.LinkList = {
  // Without Class
  desc0_1: 'LinkList',
  desc0_2: {
    $type: 'LinkList'
  },
  desc0_3: [{
    $link: true
  }],

  // With Class
  desc1_1: {
    $type: 'LinkList',
    $class: 'linkedClass'
  },
  desc1_2: [{
    $link: true,
    $class: 'linkedClass'
  }]
};

/**
 * Unordered Array of links without duplicates
 * @type {Object}
 */
exports.LinkSet = {
  // Without Class
  desc0_1: 'LinkSet',
  desc0_2: {
    $type: 'LinkSet'
  },
  desc0_3: [{
    $link: true,
    $unique: true
  }],

  // With Class
  desc1_1: {
    $type: 'LinkSet',
    $class: 'linkedClass'
  },
  desc1_2: [{
    $link: true,
    $unique: true,
    $class: 'linkedClass'
  }]
};

/**
 * Link Map - Ordered map of links with key => link
 * @type {Object}
 */
exports.LinkMap = {
  // Schema-less Without Class
  desc0_1: 'LinkMap',
  desc0_2: {
    $type: 'LinkMap'
  },

  // Schema-less With Class
  desc1_1: {
    $type: 'LinkMap',
    $class: 'linkedClass' // with class provided
  },

  // Schema-full With or Without Class
  desc2_1: {
    $type: 'LinkMap',
    prop1: 'link description',
    prop2: 'link description'
  },
  desc2_2: {
    $link: true,
    $map: true,
    prop1: 'link description',
    prop2: 'link description'
  }
};

exports.Embedded = {
  // Schema-less
  desc0_1: 'Embedded',
  desc0_2: {
    $type: 'Embedded'
  },
  desc0_3: {},

  // Schema-full
  desc1_1: {
    $class: 'linkedClass' //with class restriction
  },
  desc1_2: {
    $type: 'Embedded',
    $class: 'linkedClass' //with class restriction
  },
  desc1_3: {        //with direct structure
    prop1: '...',
    prop2: '...'
  },
  desc1_4: {        //with direct structure
    $type: 'Embedded',
    prop1: '...',
    prop2: '...'
  }
};


exports.EmbeddedList = {
  // Schema-less
  desc0_1: 'EmbeddedList',
  desc0_2: {
    $type: 'EmbeddedList'
  },
  desc0_3: {
    $type: 'EmbeddedList',
    $entry: '...' // enetry item description
  },
  desc0_4: [],

  // With linked type
  desc1_1: ['linkedType'],
  desc1_2: [{
    $type: 'linkedType'
  }],

  // Schema-full
  desc2_1: {
    $type: 'EmbeddedList',
    $class: 'linkedClass' // with class restriction
  },
  desc2_2: [{
    $class: 'linkedClass' // with class restriction
  }],
  desc2_3: [{             // with direct structure
    prop1: '...',
    prop2: '...'
  }]
};

exports.EmbeddedSet = {
  // Schema-less
  desc0_1: 'EmbeddedSet',
  desc0_2: {
    $type: 'EmbeddedSet'
  },
  desc0_3: [{
    $unique: true
  }],
  desc0_4: {
    $type: 'EmbeddedSet',
    $entry: '...'
  },

  // With Linked Type
  desc1_1: [{
    $unique: true,
    $type: 'linkedType'
  }],

  // Schema-full
  desc2_1: {
    $type: 'EmbeddedSet',
    $class: 'linkedClass' // with class restriction
  },
  desc2_2: [{
    $unique: true,
    $class: 'linkedClass' // with class restriction
  }],
  desc2_3: [{             // with direct structure
    $unique: true,
    prop1: '...',
    prop2: '...'
  }]
};

exports.EmbeddedMap = {
  // Schema-less
  desc0_1: 'EmbeddedMap',
  desc0_2: {
    $type: 'EmbeddedMap'
  },
  desc0_3: {
    $type: 'EmbeddedMap',
    $class: 'linkedClass'
  },
  desc0_4: {
    $type: 'EmbeddedMap',
    $entry: '... entry description ...'
  },

  // With Linked Type
  desc1_1: {
    $type: 'EmbeddedMap',
    $entry: 'linkedType'
  },

  // Schema-full
  desc2_1: {
    $type: 'EmbeddedMap',
    prop1: '...',
    prop2: '...'
  },

  desc2_2: {
    $map: true,
    prop1: '...',
    prop2: '...'
  }
};