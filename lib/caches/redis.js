const Redis = require('ioredis');
const _ = require('lodash');

/**
 * 
 * @param {string} host The Redis host.
 * @param {number} port The Redis port.
 * @param {number} db This Redis db.
 * @param {string} keyPrefix The key prefix to use.
 * @param {object} param4 Options, including a hook to call with the host, port, keyPrefix, and db when the client has been created.
 */
const RedisCache = function (host, port, db = 0, keyPrefix = '', {
  onClientCreated,
}) {
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

  if (!_.isNil(onClientCreated) && typeof onClientCreated !== 'function') {
    throw new Error('onClientCreated, if provided, must be a function');
  }

  const redis = new Redis({
    host: host,
    port: port,
    keyPrefix: keyPrefix,
    db: db
  });

  if (!_.isNil(onClientCreated)) {
    try {
      onClientCreated(host, port, keyPrefix, db);
    } catch (e) {
      console.error('error running onClientCreated hook:', e);
    }    
  }

  self.setpx = (key, value, ttl) => redis.set(key, value, 'PX', ttl);
  self.setnx = (key, value, ttl) => redis.set(key, value, 'PX', ttl, 'NX');
  self.get = (key) => redis.get(key);
  self.delete = (key) => redis.del(key);
  self.pttl = (key) => redis.pttl(key);

  self.client = redis;

  return self;
};

module.exports = RedisCache;