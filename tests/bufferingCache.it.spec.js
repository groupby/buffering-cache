const chai   = require('chai');
const expect = chai.expect;

const log = require('../logger');
log.level('debug');

const BufferingCache = require('../lib');
const RedisCache     = require('../lib/caches/redis');
const MemoryCache    = require('../lib/caches/memory');

describe('buffering cache', () => {
  it('testing', (done) => {
    const remoteCache = {
      store:        new RedisCache('localhost', 6379),
      ttl:          10,
      bufferFactor: 0.5
    };

    const localCache = {
      store:        new MemoryCache(10),
      ttl:          5
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info('Called with ' + first + ' ' + second + ' ' + third);
      return first + second + third;
    });

    wrappedFunction(2, 3, 4)
      .then(() => wrappedFunction(2, 3, 4))
      .then(() => wrappedFunction(2, 3, 4))
      .then(() => wrappedFunction(2, 3, 4))
      .then(() => done());
  });
});