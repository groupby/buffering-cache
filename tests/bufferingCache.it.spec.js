const chai = require('chai');
const expect = chai.expect;
const Redis = require('ioredis');

const log = require('../logger');
log.level('debug');

const BufferingCache = require('../lib');
const RedisCache = require('../lib/caches/redis');
const MemoryCache = require('../lib/caches/memory');
const Cache = require('../index');

describe('buffering cache', () => {
    const redisClient = new Redis({
        host: process.env['REDIS_HOST'],
        port: +process.env['REDIS_PORT'],
    });

    after(() => {
        redisClient.disconnect();
    });

    it('fetch value from function and cache locally and in redis', (done) => {
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       2000,
            bufferTtl: 500
        };

        const memoryCache = new MemoryCache(10);
        const localCache = {
            store: memoryCache,
            ttl:   400
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
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       2000,
            bufferTtl: 500
        };

        const memoryCache = new MemoryCache(10);
        const localCache = {
            store: memoryCache,
            ttl:   400
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
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       2000,
            bufferTtl: 500
        };

        const memoryCache = new MemoryCache(10);
        const localCache = {
            store: memoryCache,
            ttl:   400
        };

        const bufferingCache = new BufferingCache(remoteCache, localCache);

        const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
            log.info(`Called with ${first} ${second} ${third}`);
            return {result: first + second + third};
        });

        redisCache.client.flushdb()
      .then(() => memoryCache.client.reset())
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql({result: 'thisthatthe other'}))
      .then(() => memoryCache.client.keys())
      .then((localKeys) => expect(localKeys.length).to.eql(1))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => {
          expect(remoteKeys.length).to.eql(1);
          return redisCache.client.get(remoteKeys[0]);
      })
      .then((redisValue) => expect(redisValue).to.eql(JSON.stringify({value: {result: 'thisthatthe other'}})))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
    });

    it('ensure timeouts are honored by local and redis', (done) => {
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       200,
            bufferTtl: 100
        };

        const memoryCache = new MemoryCache(10);
        const localCache = {
            store: memoryCache,
            ttl:   50
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
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       200,
            bufferTtl: 100
        };

        const memoryCache = new MemoryCache(10);
        const localCache = {
            store: memoryCache,
            ttl:   50
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
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       200,
            bufferTtl: 100
        };

        const memoryCache = new MemoryCache(10);
        const localCache = {
            store: memoryCache,
            ttl:   50
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
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       200,
            bufferTtl: 100
        };

        const memoryCache = new MemoryCache(10);
        const localCache = {
            store: memoryCache,
            ttl:   50
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
      .delay(120)
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other1'))
      .delay(20) // Too allow cache refresh to complete
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => {
          expect(remoteKeys.length).to.eql(1);
          return redisCache.client.get(remoteKeys[0]);
      })
      .then((response) => expect(response).to.eql(JSON.stringify({value: 'thisthatthe other2'})))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
    });

    it('redisClient not provided', () => {
        const sampleConfig = {};
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('redisClient not valid', () => {
        const sampleConfig = {
            redisClient: 'I am a client, I swear',
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('ttlMsec not provided', () => {
        const sampleConfig = {
            redisClient,
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('ttlMsec not valid', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec: 'not very long'
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('ttlMsec out of range', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec: -1
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('bufferTtlMsec is not valid', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:       10,
            bufferTtlMsec: 'stringssss'
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('bufferTtlMsec is out of range', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:       10,
            bufferTtlMsec: -1
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('bufferTtlMsec is greater than ttlMsec', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:       10,
            bufferTtlMsec: 200
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('localCacheSize is not valid', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        10,
            bufferTtlMsec:  5,
            localCacheSize: 'strings? strings?!! striiiiiings!!!'
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('localCacheSize is out of range', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        10,
            bufferTtlMsec:  5,
            localCacheSize: -1
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('localTtlMsec is not valid', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        10,
            bufferTtlMsec:  5,
            localCacheSize: 20,
            localTtlMsec:   '!(!string))'
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('localTtlMsec is out of range', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        10,
            bufferTtlMsec:  5,
            localCacheSize: 20,
            localTtlMsec:   -1
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('localTtlMsec is greater than bufferTtlMsec', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        10,
            bufferTtlMsec:  5,
            localCacheSize: 20,
            localTtlMsec:   10
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('localTtlMsec is provided but localCacheSize is not', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:       10,
            bufferTtlMsec: 10,
            localTtlMsec:  5
        };
        expect(() => new Cache(sampleConfig)).to.throw();
    });

    it('localCacheSize is not defined', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:       600,
            bufferTtlMsec: 400,
        };

        const sampleCache = new Cache(sampleConfig);
        const parameters = sampleCache.localCache.getParams();
        expect(parameters.ttl).to.eql(400);
    });

    it('localCacheSize is defined but localTtlMsec is not', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        600,
            bufferTtlMsec:  600,
            localCacheSize: 20,
        };

        const sampleCache = new Cache(sampleConfig);
        const parameters = sampleCache.localCache.getParams();
        expect(parameters.ttl).to.eql(500);
    });

    it('localCacheSize and localTtlMsec are defined', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        600,
            bufferTtlMsec:  600,
            localCacheSize: 20,
            localTtlMsec:   300,
        };

        const sampleCache = new Cache(sampleConfig);
        const parameters = sampleCache.localCache.getParams();
        expect(parameters.ttl).to.eql(300);
    });

    it('ttl is assigned the value of remoteCacheSpec.bufferttl', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        600,
            bufferTtlMsec:  450,
            localCacheSize: 20,
        };

        const sampleCache = new Cache(sampleConfig);
        const parameters = sampleCache.localCache.getParams();
        expect(parameters.ttl).to.eql(450);
    });

    it('ttl gets a value by calling the function it is assigned', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        () => 600,
            bufferTtlMsec:  450,
            localCacheSize: 20,
        };

        const sampleCache = new Cache(sampleConfig);
        expect(sampleCache.remoteCache.getTtl()).to.eql(600);
    })

    it('ttl gets a non number value by calling the function it is assigned', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        () => 'abc',
            bufferTtlMsec:  450,
            localCacheSize: 20,
        };

        expect(() => new Cache(sampleConfig)).to.throw();
    })

    it('ttl is a negative number', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        -1,
            bufferTtlMsec:  450,
            localCacheSize: 20,
        };

        expect(() => new Cache(sampleConfig)).to.throw();
    })

    it('accepts bufferTtl as a function', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        30,
            bufferTtlMsec:  () => 14,
            localCacheSize: 20,
        };

        expect(() => new Cache(sampleConfig)).to.not.throw();
    })

    it('bufferTtl as a function is evaluated in Cache setup as a number', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        30,
            bufferTtlMsec:  () => 14,
            localCacheSize: 20,
        };

        const cache = new Cache(sampleConfig);

        console.log(cache);

        expect(cache.remoteCache.getParams().bufferTtl).to.eql(14);
    })

});