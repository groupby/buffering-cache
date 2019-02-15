'use strict';

const Redis = require('ioredis');

const RedisCache = function (host, port, db = 0, keyPrefix = '') {
  const self = this;

  if (typeof host !== 'string' || host.length < 1) {
    throw new Error('host must be a string with length');
  }

  if (typeof port !== 'number' || port < 0 || port > 65535) {
    throw new Error('port must be a number between 0 of 65535');
  }

  if (typeof db !== 'number' || db < 0) {
    throw new Error('db must be a number gte than 0');
  }

  const redis = new Redis({
    host,
    port,
    keyPrefix,
    db,
  });

  self.setpx = (key, value, ttl) => redis.set(key, value, 'PX', ttl);
  self.setnx = (key, value, ttl) => redis.set(key, value, 'PX', ttl, 'NX');
  self.get = (key) => redis.get(key);
  self.delete = (key) => redis.del(key);
  self.pttl = (key) => redis.pttl(key);

  self.client = redis;

  return self;
};

module.exports = RedisCache;
