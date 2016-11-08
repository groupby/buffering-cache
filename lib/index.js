const stringify = require('json-stable-stringify');
const uuid      = require('uuid');
const Cache     = require('./cache');
const log       = require('../logger');

const BufferingCache = function (remoteCacheSpec, localCacheSpec) {
  const self = this;

  const defaultLocalCacheSpec = {
    store: {
      get:    (key) => {},
      setex:  (key, ttl, value) => {},
      delete: (key) => {},
      ttl:    (key) => {}
    },
    ttl: 0
  };

  const remoteCache = new Cache(remoteCacheSpec);
  const localCache  = localCacheSpec ? new Cache(localCacheSpec) : new Cache(defaultLocalCacheSpec);

  self.wrapFunction = (functionToWrap, that = null) => {
    const functionUuid = uuid.v4();

    return function () {
      const args = arguments;
      const key  = functionUuid + (args && stringify(args));

      this.delete = function () {
        const deleteArgs = arguments;
        const deleteKey  = functionUuid + (deleteArgs && stringify(deleteArgs));

        log.debug(`delete cache entry for key: ${deleteKey}`);
        return localCache.delete(deleteKey)
          .then(() => remoteCache.delete(key));
      };

      log.debug(`get value for key ${key}`);

      return localCache.get(key)
        .then((localValue) => {
          if (typeof localValue !== 'undefined') {
            log.debug('Found value in local cache');

            // Deliberately not returning this promise so that it is updated in the background
            refreshBuffer(key, functionToWrap, that, args);
            return localValue;
          }

          return remoteCache.get(key).then((remoteValue) => {
            if (typeof remoteValue !== 'undefined') {
              log.debug('Found value in remote cache');

              // Deliberately not returning this promise so that it is updated in the background
              refreshBuffer(key, functionToWrap, that, args);
              return remoteValue;
            }

            return Promise.resolve(functionToWrap.apply(that, args))
              .then((response) => {
                log.debug('Fetched original value');

                updateCaches(key, response);
                return response;
              });
          });
        });
    };
  };

  const updateCaches = (key, value) => localCache.set(key, value)
    .then(() => remoteCache.set(key, value));

  const refreshLocalCache = (key, remainingRemoteTtl, value) => {};

  const refreshBuffer = (key, action, that, args) => {
    log.debug(`checkBuffer ${key}`);

    return remoteCache.ttl(key).then((ttl) => {
      const bufferTtl        = remoteCacheSpec.bufferFactor * remoteCacheSpec.ttl;
      const minTimeRemaining = remoteCacheSpec.ttl - bufferTtl;

      log.debug(`TTL: ${ttl} BufferTTL: ${bufferTtl} Remaining: ${minTimeRemaining}`);
      if (!ttl || ttl < minTimeRemaining) {
        log.debug(`TTL requires cache refresh.`);
        return Promise.resolve(action.apply(that, args))
          .then((response) => updateCaches(key, response));
      } else {
        log.debug('No cache refresh required');
        return Promise.resolve();
      }
    });
  };

  return self;
};

module.exports = BufferingCache;