const chai   = require('chai');
const expect = chai.expect;

const log = require('../logger');
log.level('debug');

const BufferingCache = require('../lib');
const RedisCache     = require('../lib/caches/redis');
const MemoryCache    = require('../lib/caches/memory');

describe('buffering cache', () => {
  it('fetch value from function and cache locally and in redis', (done) => {
    const redisCache = new RedisCache('localhost', 6379);

    const remoteCache = {
      store:     redisCache,
      ttl:       2000,
      bufferTtl: 500
    };

    const memoryCache = new MemoryCache(10);
    const localCache  = {
      store: memoryCache,
      ttl:   400
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${ first } ${ second } ${ third}`);
      return first + second + third;
    });

    redisCache.client.flushdb()
      .then(() => memoryCache.client.reset())
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other'))
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(1))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
  });

  it('ensure timeouts are honored by local and redis', (done) => {
    const redisCache = new RedisCache('localhost', 6379);

    const remoteCache = {
      store:     redisCache,
      ttl:       200,
      bufferTtl: 100
    };

    const memoryCache = new MemoryCache(10);
    const localCache  = {
      store: memoryCache,
      ttl:   50
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${ first } ${ second } ${ third}`);
      return first + second + third;
    });

    redisCache.client.flushdb()
      .then(() => memoryCache.client.reset())
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other'))
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(1))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .delay(80)
      .then(() => memoryCache.client.prune())
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(0))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .delay(250)
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(0))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(0))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
  });

  it('refresh local cache after fetching from redis', (done) => {
    const redisCache = new RedisCache('localhost', 6379);

    const remoteCache = {
      store:     redisCache,
      ttl:       200,
      bufferTtl: 100
    };

    const memoryCache = new MemoryCache(10);
    const localCache  = {
      store: memoryCache,
      ttl:   50
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${ first } ${ second } ${ third}`);
      return first + second + third;
    });

    redisCache.client.flushdb()
      .then(() => memoryCache.client.reset())
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other'))
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(1))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .delay(80)
      .then(() => memoryCache.client.prune())
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(0))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then(() => memoryCache.client.prune())
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(1))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
  });

  it('refresh local cache, and redis after fetching from function', (done) => {
    const redisCache = new RedisCache('localhost', 6379);

    const remoteCache = {
      store:     redisCache,
      ttl:       200,
      bufferTtl: 100
    };

    const memoryCache = new MemoryCache(10);
    const localCache  = {
      store: memoryCache,
      ttl:   50
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${ first } ${ second } ${ third}`);
      return first + second + third;
    });

    redisCache.client.flushdb()
      .then(() => memoryCache.client.reset())
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other'))
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(1))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .delay(250)
      .then(() => memoryCache.client.prune())
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(0))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(0))
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then(() => memoryCache.client.prune())
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(1))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
  });

  it('refresh buffer after bufferTtl', (done) => {
    const redisCache = new RedisCache('localhost', 6379);

    const remoteCache = {
      store:     redisCache,
      ttl:       200,
      bufferTtl: 100
    };

    const memoryCache = new MemoryCache(10);
    const localCache  = {
      store: memoryCache,
      ttl:   50
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    let counter           = 0;
    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${ first } ${ second } ${ third}`);
      counter++;
      return first + second + third + counter;
    });

    redisCache.client.flushdb()
      .then(() => memoryCache.client.reset())
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other1'))
      .delay(120)
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other1'))
      .delay(20) // Too allow cache refresh to complete
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => {
        expect(remoteKeys.length).to.eql(1);
        return redisCache.client.get(remoteKeys[0]);
      })
      .then((response) => expect(response).to.eql('thisthatthe other2'))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
  });
});