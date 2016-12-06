const stringify = require('json-stable-stringify');
const uuid      = require('uuid');
const Cache     = require('./cache');
const log       = require('../logger');
const Promise   = require('bluebird');

const REFRESH_LOCK_SUFFIX       = '_refresh';
const REFRESH_LOCK_TIMEOUT_MSEC = 10 * 1000;

const BufferingCache = function (remoteCacheSpec, localCacheSpec) {
  const self = this;

  const defaultLocalCacheSpec = {
    store: {
      get:    (key) => {},
      setpx:  (key, ttl, value) => {},
      delete: (key) => {}
    },
    ttl:   remoteCacheSpec.bufferTtl
  };

  const remoteCache = new Cache(remoteCacheSpec);
  const localCache  = localCacheSpec ? new Cache(localCacheSpec) : new Cache(defaultLocalCacheSpec);

  if (!remoteCacheSpec.bufferTtl) {
    throw new Error('remote bufferTtl must be defined');
  }

  if (localCacheSpec && remoteCacheSpec.ttl < localCacheSpec.ttl) {
    throw new Error('local cache has higher ttl than remote cache');
  }

  if (localCacheSpec && localCacheSpec.ttl > remoteCacheSpec.bufferTtl) {
    throw new Error('local cache ttl must be less than buffer ttl');
  }

  self.wrapFunction = (functionToWrap, that = null, functionId = null) => {
    functionId = (typeof functionId === 'string' && functionId) || functionToWrap.name || uuid.v4();

    return function () {
      const args = arguments;
      const key  = functionId + (args && stringify(args));

      this.delete = function () {
        const deleteArgs = arguments;
        const deleteKey  = functionId + (deleteArgs && stringify(deleteArgs));

        log.debug(`delete cache entry for key: ${deleteKey}`);
        return localCache.delete(deleteKey)
          .then(() => remoteCache.delete(key));
      };

      log.debug(`get value for key ${key}`);

      return localCache.get(key)
        .then((localValue) => {
          if (typeof localValue !== 'undefined') {
            log.debug('Found value in local cache');
            return localValue;
          }

          return remoteCache.get(key).then((remoteValue) => {
            if (typeof remoteValue !== 'undefined' && remoteValue !== null) {
              log.debug('Found value in remote cache');
              return localCache.setpx(key, remoteValue, localCacheSpec.ttl).return(remoteValue);
            }

            return Promise.resolve(functionToWrap.apply(that, args))
              .then((response) => {
                log.debug('Fetched original value');
                return updateCaches(key, response).return(response);
              });
          });
        })
        .then((value) => {
          self.__refreshBuffer(key, value, functionToWrap, that, args);

          return value;
        });
    };
  };

  const updateCaches = (key, value) => localCache.setpx(key, value)
    .then(() => remoteCache.setpx(key, value));

  self.__refreshBuffer = (key, cachedValue, action, that, args) => {
    log.debug(`checkBuffer ${key}`);

    return remoteCache.pttl(key).then((ttl) => {
      const minTimeRemaining = remoteCacheSpec.ttl - remoteCacheSpec.bufferTtl;

      log.debug(`TTL: ${ttl} BufferTTL: ${remoteCacheSpec.bufferTtl} Min Time Remaining: ${minTimeRemaining}`);

      if (!ttl || ttl < minTimeRemaining) {
        log.debug(`TTL requires cache refresh.`);
        return self.obtainRefreshLock(key).then((locked) => {
          if (locked) {
            return Promise.resolve(action.apply(that, args))
              .then((response) => remoteCache.setpx(key, response)
                .then(() => localCache.setpx(key, response, localCacheSpec.ttl)))
              .finally(() => self.releaseRefreshLock(key));
          } else {
            log.debug('Could not lock for refresh');
          }
        });


      } else {
        log.debug('No cache refresh required');
      }
    });
  };

  self.obtainRefreshLock = (key) => remoteCache.setnx(`${key}-${REFRESH_LOCK_SUFFIX}`, 'TRUE', REFRESH_LOCK_TIMEOUT_MSEC)
    .then((res) => res === 'OK');

  self.releaseRefreshLock = (key) => remoteCache.delete(`${key}-${REFRESH_LOCK_SUFFIX}`);

  return self;
};

module.exports = BufferingCache;