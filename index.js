const BufferCache = require('./lib');
const RedisCache = require('./lib/caches/redis');
const _ = require('lodash');

const DEFAULT_LOCAL_CACHE_TTL_MSEC = 500;

/**
 * Required parameters:
 * - redisClient
 * - ttlMsec
 *
 * Optional parameters:
 * - options: options for the buffering cache instance, right now just local/remote hit/miss hooks
 */
module.exports = function ({
    redisClient,
    ttlMsec,
    options,
}) {
    if (_.isNil(redisClient) && !_.isObject(redisClient)) {
        throw new Error('redisClient must be provided and must be an object');
    }

    if (_.isNil(ttlMsec) || (!_.isNumber(ttlMsec) && !_.isFunction(ttlMsec))) {
        throw new Error('ttlMsec must be provided and must be a positive number or a function that returns a positive number');
    }

    const cacheTtl = _.isFunction(ttlMsec) ? ttlMsec() : ttlMsec
    
    if(!_.isNumber(cacheTtl) || cacheTtl < 0){
        throw new Error('ttl must be a number greater than 0 or a function which returns a number greater than 0');
    }

    const remoteCacheSpec = {
        store:     new RedisCache(redisClient),
        ttl:       ttlMsec,
    };

    return new BufferCache(remoteCacheSpec,
        !_.isNil(options) ? options : undefined);
};

module.exports.CACHE_LEVEL = BufferCache.CACHE_LEVEL;