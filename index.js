'use strict';

const BufferCache = require('./lib');
const RedisCache = require('./lib/caches/redis');
const MemoryCache = require('./lib/caches/memory');

const DEFAULT_LOCAL_CACHE_TTL_MSEC = 500;

module.exports = function (config) {
  /**
   * Required parameters:
   * - host
   * - port
   * - ttlMsec
   *
   * Optional parameters:
   * - db: defaults to 0
   * - keyPrefix: defaults to '', applies to all redis keys
   * - bufferTtlMsec: defaults to ttlMsec / 2
   * - localCacheSize: defaults to 0 (disabled)
   * - localTtlMsec: defaults to 500, only applies if localCacheSize is greater than 0
   */

  if (!config || typeof config !== 'object') {
    throw new Error('configuration must be provided');
  }

  if (!config.host || typeof config.host !== 'string') {
    throw new Error('host must be provided');
  }

  if (!config.port || typeof config.port !== 'number' || config.port < 0 || config.port > 65535) {
    throw new Error('port must be a number 0-65535');
  }

  if (!config.ttlMsec || typeof config.ttlMsec !== 'number' || config.ttlMsec <= 0) {
    throw new Error('ttlMsec must be a number greater than 0');
  }

  if (config.db && (typeof config.db !== 'number' || config.db < 0 || config.db > 255)) {
    throw new Error('if provided, db must be a number 0-255');
  }

  if (config.bufferTtlMsec && (typeof config.bufferTtlMsec !== 'number' || config.bufferTtlMsec <= 0 || config.bufferTtlMsec > config.ttlMsec)) {
    throw new Error('if provided, bufferTtlMsec must be a number greater than 0 and less than ttlMsec');
  }

  if (config.localCacheSize && (typeof config.localCacheSize !== 'number' || config.localCacheSize < 0)) {
    throw new Error('if provided, localCacheSize must be a number gte 0');
  }

  if (config.localTtlMsec && (typeof config.localTtlMsec !== 'number' || config.localTtlMsec <= 0 || config.localTtlMsec > config.bufferTtlMsec)) {
    throw new Error('if provided, localTtlMsec must be a number greater than 0 and less than bufferTtlMsec');
  }

  if (!config.localCacheSize && config.localTtlMsec) {
    throw new Error('if localTtlMsec is provided, localCacheSize must be provided as well');
  }

  if (config.keyPrefix && (typeof config.keyPrefix !== 'string')) {
    throw new Error('if provided, keyPrefix must be a string');
  }

  const remoteCacheSpec = {
    store: new RedisCache(config.host, config.port, config.db, config.keyPrefix),
    ttl: config.ttlMsec,
    bufferTtl: config.bufferTtlMsec || config.ttlMsec / 2,
  };

  let localCacheSpec;

  if (config.localCacheSize > 0) {
    let ttl = DEFAULT_LOCAL_CACHE_TTL_MSEC;

    if (config.localTtlMsec) {
      ttl = config.localTtlMsec;
    } else if (remoteCacheSpec.bufferTtl && remoteCacheSpec.bufferTtl < DEFAULT_LOCAL_CACHE_TTL_MSEC) {
      ttl = remoteCacheSpec.bufferTtl;
    }
    localCacheSpec = {
      store: new MemoryCache(config.localCacheSize),
      ttl,
    };
  }
  return new BufferCache(remoteCacheSpec, localCacheSpec);
};

module.exports.CACHE_LEVEL = BufferCache.CACHE_LEVEL;
