const Redis = require('ioredis');
const _ = require('lodash');

/**
 * Creates a RedisCache.
 * @param {object} param0 The options. If redisClient isn't specified, a new Redis client is created.
 */
const RedisCache = function (redisClient) {
    const self = this;

    if (_.isNil(redisClient)
        || !_.isObject(redisClient)
        || !_.has(redisClient, 'set', 'get', 'del', 'pttl')) {
        throw new Error(`redisClient must be provided and must be an object with the properties "set", "get", "del", and "pttl"`);
    }

    self.setpx = (key, value, ttl) => redisClient.set(key, value, 'PX', ttl);
    self.setnx = (key, value, ttl) => redisClient.set(key, value, 'PX', ttl, 'NX');
    self.get = (key) => redisClient.get(key);
    self.delete = (key) => redisClient.del(key);
    self.pttl = (key) => redisClient.pttl(key);

    self.client = redis;

    return self;
};

module.exports = RedisCache;
