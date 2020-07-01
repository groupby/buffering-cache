const Redis = require('ioredis');
const _ = require('lodash');

/**
 * 
 * @param {object} redisClient A Redis client.
 */
const RedisCache = function (redisClient) {
    const self = this;

    if (_.isNil(redisClient) || !_.isObject(redisClient)) {
        throw new Error(`redisClient must be provided and must be an object`);
    }

    self.setpx = (key, value, ttl) => redisClient.set(key, value, 'PX', ttl);
    self.setnx = (key, value, ttl) => redisClient.set(key, value, 'PX', ttl, 'NX');
    self.get = (key) => redisClient.get(key);
    self.delete = (key) => redisClient.del(key);
    self.pttl = (key) => redisClient.pttl(key);

    self.client = redisClient;

    return self;
};

module.exports = RedisCache;
