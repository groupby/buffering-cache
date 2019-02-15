'use strict';

const { expect } = require('chai');
const Promise = require('bluebird');

const log = require('../logger');

log.level('debug');

const BufferingCache = require('../lib');
const RedisCache = require('../lib/caches/redis');
const MemoryCache = require('../lib/caches/memory');
const Cache = require('../index');

describe('buffering cache', () => {
  it('fetch value from function and cache locally and in redis', (done) => {
    const redisCache = new RedisCache('localhost', 6379);

    const remoteCache = {
      store: redisCache,
      ttl: 2000,
      bufferTtl: 500,
    };

    const memoryCache = new MemoryCache(10);
    const localCache = {
      store: memoryCache,
      ttl: 400,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${first} ${second} ${third}`);
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

  it('delete value from local cache and from redis cache', (done) => {
    const redisCache = new RedisCache('localhost', 6379);

    const remoteCache = {
      store: redisCache,
      ttl: 2000,
      bufferTtl: 500,
    };

    const memoryCache = new MemoryCache(10);
    const localCache = {
      store: memoryCache,
      ttl: 400,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${first} ${second} ${third}`);
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
      .then(() => wrappedFunction.delete('this', 'that', 'the other'))
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(0))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(0))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
  });

  it('fetch object from function and cache locally and in redis', (done) => {
    const redisCache = new RedisCache('localhost', 6379);

    const remoteCache = {
      store: redisCache,
      ttl: 2000,
      bufferTtl: 500,
    };

    const memoryCache = new MemoryCache(10);
    const localCache = {
      store: memoryCache,
      ttl: 400,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${first} ${second} ${third}`);
      return { result: first + second + third };
    });

    redisCache.client.flushdb()
      .then(() => memoryCache.client.reset())
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql({ result: 'thisthatthe other' }))
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(1))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => {
        expect(remoteKeys.length).to.eql(1);
        return redisCache.client.get(remoteKeys[0]);
      })
      .then((redisValue) => expect(redisValue).to.eql(JSON.stringify({ value: { result: 'thisthatthe other' } })))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
  });

  it('ensure timeouts are honored by local and redis', async () => {
    const redisCache = new RedisCache('localhost', 6379);

    const remoteCache = {
      store: redisCache,
      ttl: 200,
      bufferTtl: 100,
    };

    const memoryCache = new MemoryCache(10);
    const localCache = {
      store: memoryCache,
      ttl: 50,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${first} ${second} ${third}`);
      return first + second + third;
    });

    await redisCache.client.flushdb();
    await memoryCache.client.reset();
    const response = await wrappedFunction('this', 'that', 'the other');

    expect(response).to.eql('thisthatthe other');
    expect((await memoryCache.client.keys()).length).to.eql(1);
    expect((await redisCache.client.keys('*')).length).to.eql(1);

    await Promise.delay(80);

    await memoryCache.client.prune();
    expect((await memoryCache.client.keys()).length).to.eql(0);

    expect((await redisCache.client.keys('*')).length).to.eql(1);

    await Promise.delay(250);

    expect((await memoryCache.client.keys()).length).to.eql(0);
    expect((await redisCache.client.keys('*')).length).to.eql(0);
  });

  it('refresh local cache after fetching from redis', (done) => {
    const redisCache = new RedisCache('localhost', 6379);

    const remoteCache = {
      store: redisCache,
      ttl: 200,
      bufferTtl: 100,
    };

    const memoryCache = new MemoryCache(10);
    const localCache = {
      store: memoryCache,
      ttl: 50,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${first} ${second} ${third}`);
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
      .then(() => Promise.delay(80))
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
      store: redisCache,
      ttl: 200,
      bufferTtl: 100,
    };

    const memoryCache = new MemoryCache(10);
    const localCache = {
      store: memoryCache,
      ttl: 50,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${first} ${second} ${third}`);
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
      .then(() => Promise.delay(250))
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
      store: redisCache,
      ttl: 200,
      bufferTtl: 100,
    };

    const memoryCache = new MemoryCache(10);
    const localCache = {
      store: memoryCache,
      ttl: 50,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    let counter = 0;
    const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
      log.info(`Called with ${first} ${second} ${third}`);
      counter++;
      return first + second + third + counter;
    });

    redisCache.client.flushdb()
      .then(() => memoryCache.client.reset())
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other1'))
      .then(() => Promise.delay(120))
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other1'))
      .then(() => Promise.delay(20)) // Too allow cache refresh to complete
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => {
        expect(remoteKeys.length).to.eql(1);
        return redisCache.client.get(remoteKeys[0]);
      })
      .then((response) => expect(response).to.eql(JSON.stringify({ value: 'thisthatthe other2' })))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
  });

  it('configuration is not provided', () => {
    expect(() => new Cache()).to.throw('configuration must be provided');
  });

  it('host is not present', () => {
    const noHostConfig = {};
    expect(() => new Cache(noHostConfig)).to.throw('host must be provided');
  });

  it('host is not valid', () => {
    const wrongHostConfig = { host: 5 };
    expect(() => new Cache(wrongHostConfig)).to.throw('host must be provided');
  });

  it('port is not present', () => {
    const sampleConfig = {
      host: 'localhost',
    };
    expect(() => new Cache(sampleConfig)).to.throw('port must be a number 0-65535');
  });

  it('port is not valid', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 'strings lol',
    };
    expect(() => new Cache(sampleConfig)).to.throw('port must be a number 0-65535');
  });

  it('port is out of range', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 65536,
    };
    expect(() => new Cache(sampleConfig)).to.throw('port must be a number 0-65535');
  });

  it('port is out of range low', () => {
    const sampleConfig = {
      host: 'localhost',
      port: -1,
    };
    expect(() => new Cache(sampleConfig)).to.throw('port must be a number 0-65535');
  });

  it('ttlMsec not provided', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
    };
    expect(() => new Cache(sampleConfig)).to.throw('ttlMsec must be a number greater than 0');
  });

  it('ttlMsec not valid', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 'moar strings',
    };
    expect(() => new Cache(sampleConfig)).to.throw('ttlMsec must be a number greater than 0');
  });

  it('ttlMsec out of range', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: -1,
    };
    expect(() => new Cache(sampleConfig)).to.throw('ttlMsec must be a number greater than 0');
  });

  it('db is not valid', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: 'strings boogaloo',
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, db must be a number 0-255');
  });

  it('db is out of range', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: -1,
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, db must be a number 0-255');
  });

  it('db is out of range high', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: 256,
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, db must be a number 0-255');
  });

  it('bufferTtlMsec is not valid', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: 255,
      bufferTtlMsec: 'stringssss',
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, bufferTtlMsec must be a number greater than 0 and less than ttlMsec');
  });

  it('bufferTtlMsec is out of range', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: 255,
      bufferTtlMsec: -1,
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, bufferTtlMsec must be a number greater than 0 and less than ttlMsec');
  });

  it('bufferTtlMsec is greater than ttlMsec', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: 255,
      bufferTtlMsec: 200,
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, bufferTtlMsec must be a number greater than 0 and less than ttlMsec');
  });

  it('localCacheSize is not valid', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: 255,
      bufferTtlMsec: 5,
      localCacheSize: 'strings? strings?!! striiiiiings!!!',
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, localCacheSize must be a number gte 0');
  });

  it('localCacheSize is out of range', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: 255,
      bufferTtlMsec: 5,
      localCacheSize: -1,
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, localCacheSize must be a number gte 0');
  });

  it('localTtlMsec is not valid', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: 255,
      bufferTtlMsec: 5,
      localCacheSize: 20,
      localTtlMsec: '!(!string))',
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, localTtlMsec must be a number greater than 0 and less than bufferTtlMsec');
  });

  it('localTtlMsec is out of range', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: 255,
      bufferTtlMsec: 5,
      localCacheSize: 20,
      localTtlMsec: -1,
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, localTtlMsec must be a number greater than 0 and less than bufferTtlMsec');
  });

  it('localTtlMsec is greater than bufferTtlMsec', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: 255,
      bufferTtlMsec: 5,
      localCacheSize: 20,
      localTtlMsec: 10,
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, localTtlMsec must be a number greater than 0 and less than bufferTtlMsec');
  });

  it('localTtlMsec is provided but localCacheSize is not', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 10,
      db: 255,
      bufferTtlMsec: 10,
      localTtlMsec: 5,
    };
    expect(() => new Cache(sampleConfig)).to.throw('if localTtlMsec is provided, localCacheSize must be provided as well');
  });

  it('keyPrefix is not valid', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 600,
      db: 255,
      bufferTtlMsec: 500,
      localCacheSize: 20,
      localTtlMsec: 200,
      keyPrefix: 2,
    };
    expect(() => new Cache(sampleConfig)).to.throw('if provided, keyPrefix must be a string');
  });

  it('localCacheSize is not defined', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 600,
      db: 255,
      bufferTtlMsec: 400,
      keyPrefix: 'prefix',
    };

    const sampleCache = new Cache(sampleConfig);
    const parameters = sampleCache.localCache.getParams();
    expect(parameters.ttl).to.eql(400);
  });

  it('localCacheSize is defined but localTtlMsec is not', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 600,
      db: 255,
      bufferTtlMsec: 600,
      localCacheSize: 20,
      keyPrefix: 'prefix',
    };

    const sampleCache = new Cache(sampleConfig);
    const parameters = sampleCache.localCache.getParams();
    expect(parameters.ttl).to.eql(500);
  });

  it('localCacheSize and localTtlMsec are defined', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 600,
      db: 255,
      bufferTtlMsec: 600,
      localCacheSize: 20,
      localTtlMsec: 300,
      keyPrefix: 'prefix',
    };

    const sampleCache = new Cache(sampleConfig);
    const parameters = sampleCache.localCache.getParams();
    expect(parameters.ttl).to.eql(300);
  });

  it('ttl is assigned the value of remoteCacheSpec.bufferttl', () => {
    const sampleConfig = {
      host: 'localhost',
      port: 1337,
      ttlMsec: 600,
      db: 255,
      bufferTtlMsec: 450,
      localCacheSize: 20,
      keyPrefix: 'prefix',
    };

    const sampleCache = new Cache(sampleConfig);
    const parameters = sampleCache.localCache.getParams();
    expect(parameters.ttl).to.eql(450);
  });
});
