const LRU = require('lru-cache');

const MemoryCache = function(maxSize) {
  const self = this;

  const lru = new LRU({max: maxSize});

  self.get = (key) => lru.get(key);
  self.setex = (key, ttl, value) => lru.set(key, value, ttl);
  self.delete = (key) => lru.del(key);
  self.ttl = (key) => -1;

  return self;
};

module.exports = MemoryCache;