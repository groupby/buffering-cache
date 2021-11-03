const BufferCache = require('./lib');
const RedisCache = require('./lib/caches/redis');
const MemoryCache = require('./lib/caches/memory');
const _ = require('lodash');

const DEFAULT_LOCAL_CACHE_TTL_MSEC = 500;

/**
 * Required parameters:
 * - redisClient
 * - ttlMsec
 *
 * Optional parameters:
 * - bufferTtlMsec: defaults to ttlMsec / 2
 * - localCacheSize: defaults to 0 (disabled)
 * - localTtlMsec: defaults to 500, only applies if localCacheSize is greater than 0
 * - options: options for the buffering cache instance, right now just local/remote hit/miss hooks
 */
module.exports = function ({
    redisClient,
    ttlMsec,
    bufferTtlMsec,
    localCacheSize,
    localTtlMsec,
    options,
}) {
    if (_.isNil(redisClient) && !_.isObject(redisClient)) {
        throw new Error('redisClient must be provided and must be an object');
    }

    if (_.isNil(ttlMsec) || (!_.isNumber(ttlMsec) && !_.isFunction(ttlMsec))) {
        throw new Error('ttlMsec must be provided and must be a positive number or a function that returns a positive number');
    }

    if (!_.isNil(bufferTtlMsec) && !_.isNumber(bufferTtlMsec) && !_.isFunction(bufferTtlMsec)) {
        throw new Error('bufferTtlMsec, if provided, must be a number or a function that returns a number greater than 0 and less than or equal to ttlMsec');
    }

    const cacheTtl = _.isFunction(ttlMsec) ? ttlMsec() : ttlMsec
    const cacheBufferTtl = _.isFunction(bufferTtlMsec) ? bufferTtlMsec() : bufferTtlMsec

    if(!_.isNumber(cacheTtl) || cacheTtl < 0){
        throw new Error('ttl must be a number greater than 0 or a function which returns a number greater than 0');
    }

    if(((!_.isNil(cacheBufferTtl) && !_.isNumber(cacheBufferTtl)) || cacheBufferTtl < 0 || cacheBufferTtl > cacheTtl)) {
        throw new Error('ttl must be a number greater than 0 or a function which returns a number greater than 0');
    }

    if (!_.isNil(localCacheSize) && (!_.isNumber(localCacheSize) || localCacheSize < 0)) {
        throw new Error('localCacheSize, if provided, must be a number greater than or equal to 0');
    }

    if (!_.isNil(localTtlMsec) && (!_.isNumber(localTtlMsec) || localTtlMsec <= 0 || localTtlMsec > cacheBufferTtl)) {
        throw new Error('localTtlMsec, if provided, must be a number greater than 0 and less than or equal to bufferTtlMsec');
    }

    if (!_.isNil(localTtlMsec) && _.isNil(localCacheSize)) {
        throw new Error('if localTtlMsec is provided, localCacheSize must be provided as well');
    }

    const remoteCacheSpec = {
        store:     new RedisCache(redisClient),
        ttl:       ttlMsec,
        bufferTtl: cacheBufferTtl ||  cacheTtl / 2,
    };

    let localCacheSpec = undefined;

    if (!_.isNil(localCacheSize) && localCacheSize > 0) {
        let ttl = DEFAULT_LOCAL_CACHE_TTL_MSEC;

        if (localTtlMsec) {
            ttl = localTtlMsec;
        } else if (!_.isNil(cacheBufferTtl) && cacheBufferTtl < DEFAULT_LOCAL_CACHE_TTL_MSEC) {
            ttl = cacheBufferTtl;
        }
        localCacheSpec = {
            store: new MemoryCache(localCacheSize),
            ttl:   ttl
        };
    }

    return new BufferCache(remoteCacheSpec, localCacheSpec,
        !_.isNil(options) ? options : undefined);
};

module.exports.CACHE_LEVEL = BufferCache.CACHE_LEVEL;