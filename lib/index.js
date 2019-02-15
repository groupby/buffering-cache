'use strict';

/* eslint-disable no-unused-vars, consistent-return */

const stringify = require('json-stable-stringify');
const uuid = require('uuid');
const Promise = require('bluebird');
const Cache = require('./cache');
const log = require('../logger');

const REFRESH_LOCK_SUFFIX = '_refresh';
const REFRESH_LOCK_TIMEOUT_MSEC = 10 * 1000;

const CACHE_LEVEL = {
  LOCAL: 'localCache',
  REMOTE: 'remoteCache',
  SERVICE: 'service',
};

const BufferingCache = function (remoteCacheSpec, localCacheSpec) {
  const self = this;

  const defaultLocalCacheSpec = {
    store: {
      get: (key) => {},
      setpx: (key, ttl, value) => {},
      delete: (key) => {},
      client: {},
    },
    ttl: remoteCacheSpec.bufferTtl,
  };

  self.remoteCache = new Cache(remoteCacheSpec);
  self.localCache = localCacheSpec ? new Cache(localCacheSpec) : new Cache(defaultLocalCacheSpec);

  if (!remoteCacheSpec.bufferTtl) {
    throw new Error('remote bufferTtl must be defined');
  }

  if (localCacheSpec && remoteCacheSpec.ttl < localCacheSpec.ttl) {
    throw new Error('local cache has higher ttl than remote cache');
  }

  if (localCacheSpec && localCacheSpec.ttl > remoteCacheSpec.bufferTtl) {
    throw new Error('local cache ttl must be less than buffer ttl');
  }

  const wrapForRedis = (input) => JSON.stringify({ value: input });
  const unwrapFromRedis = (input) => JSON.parse(input).value;
  const updateCaches = (key, value) => self.localCache.setpx(key, value)
    .then(() => self.remoteCache.setpx(key, wrapForRedis(value)));

  self.wrapFunction = (functionToWrap, that = null, functionId = null, postCallMutator = null) => {
    functionId = (typeof functionId === 'string' && functionId) || functionToWrap.name || uuid.v4();

    if (postCallMutator && typeof (postCallMutator) !== 'function') {
      throw new Error(`postCallMutator must be a function. You passed a ${typeof (postCallMutator)}`);
    }

    postCallMutator = postCallMutator || ((r) => r);

    const cacheFunction = function (...args) {
      const key = functionId + (args && stringify(args));

      log.debug(`get value for key ${key}`);

      return self.localCache.get(key)
        .then((localValue) => {
          if (typeof localValue !== 'undefined') {
            log.debug('Found value in local cache');
            return (postCallMutator(localValue, CACHE_LEVEL.LOCAL));
          }

          return self.remoteCache.get(key).then((remoteValue) => {
            remoteValue = remoteValue ? unwrapFromRedis(remoteValue) : null;

            if (remoteValue !== null && typeof remoteValue !== 'undefined') {
              log.debug('Found value in remote cache');
              return self.localCache.setpx(key, remoteValue, localCacheSpec.ttl).return(postCallMutator(remoteValue, CACHE_LEVEL.REMOTE));
            }

            return Promise.resolve(functionToWrap.apply(that, args))
              .then((response) => {
                log.debug('Fetched service value');
                return updateCaches(key, response).return((postCallMutator(response, CACHE_LEVEL.SERVICE)));
              });
          });
        })
        .then((value) => {
          self.__refreshBuffer(key, value, functionToWrap, that, args);

          return value;
        });
    };
    cacheFunction.delete = function (...deleteArgs) {
      const deleteKey = functionId + (deleteArgs && stringify(deleteArgs));

      log.debug(`delete cache entry for key: ${deleteKey}`);
      return self.localCache.delete(deleteKey)
        .then(() => self.remoteCache.delete(deleteKey));
    };
    return cacheFunction;
  };

  self.__refreshBuffer = (key, cachedValue, action, that, args) => {
    log.debug(`checkBuffer ${key}`);

    return self.remoteCache.pttl(key).then((ttl) => {
      const minTimeRemaining = remoteCacheSpec.ttl - remoteCacheSpec.bufferTtl;

      log.debug(`TTL: ${ttl} BufferTTL: ${remoteCacheSpec.bufferTtl} Min Time Remaining: ${minTimeRemaining}`);

      if (!ttl || ttl < minTimeRemaining) {
        log.debug('TTL requires cache refresh.');
        return self.obtainRefreshLock(key).then((locked) => {
          if (locked) {
            return Promise.resolve(action.apply(that, args))
              .then((response) => self.remoteCache.setpx(key, wrapForRedis(response))
                .then(() => self.localCache.setpx(key, response, localCacheSpec.ttl)))
              .finally(() => self.releaseRefreshLock(key));
          }
          log.debug('Could not lock for refresh');
        });
      }
      log.debug('No cache refresh required');
    });
  };

  self.obtainRefreshLock = (key) => self.remoteCache.setnx(`${key}-${REFRESH_LOCK_SUFFIX}`, 'TRUE', REFRESH_LOCK_TIMEOUT_MSEC)
    .then((res) => res === 'OK');

  self.releaseRefreshLock = (key) => self.remoteCache.delete(`${key}-${REFRESH_LOCK_SUFFIX}`);

  return self;
};

BufferingCache.CACHE_LEVEL = CACHE_LEVEL;
module.exports = BufferingCache;
