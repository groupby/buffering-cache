'use strict';

const LRU = require('lru-cache');

const MemoryCache = function (maxSize) {
  const self = this;

  const lru = new LRU({ max: maxSize });

  self.get = (key) => lru.get(key);
  self.setpx = (key, value, ttl) => lru.set(key, value, ttl);
  self.delete = (key) => lru.del(key);

  self.client = lru;

  return self;
};

module.exports = MemoryCache;
