const stringify = require('json-stable-stringify');
const uuid = require('uuid');
const Cache = require('./cache');
const log = require('../logger');
const Promise = require('bluebird');
const _ = require('lodash');

const REFRESH_LOCK_SUFFIX = '_refresh';
const REFRESH_LOCK_TIMEOUT_MSEC = 10 * 1000;

const CACHE_LEVEL = {
    LOCAL: 'localCache',
    REMOTE: 'remoteCache',
    SERVICE: 'service'
};

/**
 * 
 * @param {*} remoteCacheSpec The spec for the cache using a Redis client.
 * @param {*} options Options, including hooks for logging and metrics.
 */
const BufferingCache = function (remoteCacheSpec, options) {
    const self = this;

    self.remoteCache = new Cache(remoteCacheSpec);

    // No op hooks that are replaced with hooks provided via options if provided.
    let onRedisCacheHit = () => { };
    let onRedisCacheMiss = () => { };

    if (!_.isNil(options)) {
        if (!_.isNil(options.onRedisCacheHit)) {
            if (!_.isFunction(options.onRedisCacheHit)) {
                throw new Error('options.onRedisCacheHit, if provided, must be a function');
            }
            onRedisCacheHit = options.onRedisCacheHit;
        }

        if (!_.isNil(options.onRedisCacheMiss)) {
            if (!_.isFunction(options.onRedisCacheMiss)) {
                throw new Error('options.onRedisCacheMiss, if provided, must be a function');
            }
            onRedisCacheMiss = options.onRedisCacheMiss;
        }
    }

    self.wrapFunction = (functionToWrap, that = null, functionId = null, postCallMutator = null) => {
        functionId = (typeof functionId === 'string' && functionId) || functionToWrap.name || uuid.v4();

        if (postCallMutator && typeof (postCallMutator) !== 'function') {
            throw new Error(`postCallMutator must be a function. You passed a ${typeof (postCallMutator)}`);
        }

        postCallMutator = postCallMutator || ((r) => r);

        const cacheFunction = function () {
            const args = arguments;
            const key = functionId + (args && stringify(args));

            log.debug(`get value for key ${key}`);

            return self.remoteCache.get(key).then((remoteValue) => {
                        remoteValue = remoteValue ? unwrapFromRedis(remoteValue) : null;

                        if (remoteValue !== null && typeof remoteValue !== 'undefined') {
                            log.debug('Found value in remote cache');
                            onRedisCacheHit();

                            return Promise.resolve(postCallMutator(remoteValue, CACHE_LEVEL.REMOTE));
                        }

                        return Promise.resolve(functionToWrap.apply(that, args))
                            .then((response) => {
                                log.debug('Fetched service value');
                                onRedisCacheMiss();


                                return updateCaches(key, response).return((postCallMutator(response, CACHE_LEVEL.SERVICE)));
                            });
                    });
        };
        cacheFunction.delete = function () {
            const deleteArgs = arguments;
            const deleteKey = functionId + (deleteArgs && stringify(deleteArgs));

            log.debug(`delete cache entry for key: ${deleteKey}`);
            return self.remoteCache.delete(deleteKey);
        };
        return cacheFunction;
    };

    const wrapForRedis = (input) => JSON.stringify({ value: input });
    const unwrapFromRedis = (input) => JSON.parse(input).value;

    const updateCaches = (key, value) => self.remoteCache.setpx(key, wrapForRedis(value));

    self.obtainRefreshLock = (key) => self.remoteCache.setnx(`${key}-${REFRESH_LOCK_SUFFIX}`, 'TRUE', REFRESH_LOCK_TIMEOUT_MSEC)
        .then((res) => res === 'OK');

    self.releaseRefreshLock = (key) => self.remoteCache.delete(`${key}-${REFRESH_LOCK_SUFFIX}`);

    return self;
};

BufferingCache.CACHE_LEVEL = CACHE_LEVEL;
module.exports = BufferingCache;