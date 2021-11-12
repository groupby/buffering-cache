const chai = require('chai');
const expect = chai.expect;
const Redis = require('ioredis');

const log = require('../logger');
log.level('debug');

const BufferingCache = require('../lib');
const RedisCache = require('../lib/caches/redis');
const Cache = require('../index');

describe('buffering cache', () => {
    const redisClient = new Redis({
        host: process.env['REDIS_HOST'],
        port: +process.env['REDIS_PORT'],
    });

    after(() => {
        redisClient.disconnect();
    });

    it('fetch value from function and in redis', (done) => {
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       2000,
        };

        const bufferingCache = new BufferingCache(remoteCache);

        const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
            log.info(`Called with ${first} ${second} ${third}`);
            return first + second + third;
        });

        redisCache.client.flushdb()
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other'))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
    });

    it('delete value from redis cache', (done) => {
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       2000,
        };

        const bufferingCache = new BufferingCache(remoteCache);

        const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
            log.info(`Called with ${first} ${second} ${third}`);
            return first + second + third;
        });

        redisCache.client.flushdb()
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other'))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .then(() => wrappedFunction.delete('this', 'that', 'the other'))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(0))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
    });

    it('fetch object from function and cache in redis', (done) => {
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       2000,
        };

        const bufferingCache = new BufferingCache(remoteCache);

        const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
            log.info(`Called with ${first} ${second} ${third}`);
            return {result: first + second + third};
        });

        redisCache.client.flushdb()
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql({result: 'thisthatthe other'}))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => {
          expect(remoteKeys.length).to.eql(1);
          return redisCache.client.get(remoteKeys[0]);
      })
      .then((redisValue) => expect(redisValue).to.eql(JSON.stringify({value: {result: 'thisthatthe other'}})))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
    });

    it('ensure timeouts are honored by redis', (done) => {
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       200,
        };

        const bufferingCache = new BufferingCache(remoteCache);

        const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
            log.info(`Called with ${first} ${second} ${third}`);
            return first + second + third;
        });

        redisCache.client.flushdb()
      .then(() => wrappedFunction('this', 'that', 'the other'))
      .then((response) => expect(response).to.eql('thisthatthe other'))
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .delay(80)
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
      .delay(250)
      .then(() => redisCache.client.keys('*'))
      .then((remoteKeys) => expect(remoteKeys.length).to.eql(0))
      .then(() => done())
      .catch((err) => done(err || 'fail'));
    });

    it('refresh redis after fetching from function', (done) => {
        const redisCache = new RedisCache(redisClient);

        const remoteCache = {
            store:     redisCache,
            ttl:       200,
        };

        const bufferingCache = new BufferingCache(remoteCache);

        const wrappedFunction = bufferingCache.wrapFunction((first, second, third) => {
            log.info(`Called with ${first} ${second} ${third}`);
            return first + second + third;
        });

        redisCache.client.flushdb()
            .then(() => wrappedFunction('this', 'that', 'the other'))
            .then((response) => expect(response).to.eql('thisthatthe other'))
            .then(() => redisCache.client.keys('*'))
            .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
            .delay(250)
            .then(() => redisCache.client.keys('*'))
            .then((remoteKeys) => expect(remoteKeys.length).to.eql(0))
            .then(() => wrappedFunction('this', 'that', 'the other'))
            .then(() => redisCache.client.keys('*'))
            .then((remoteKeys) => expect(remoteKeys.length).to.eql(1))
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

    it('ttl gets a value by calling the function it is assigned', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        () => 600,
            bufferTtlMsec:  450
        };

        const sampleCache = new Cache(sampleConfig);
        expect(sampleCache.remoteCache.getTtl()).to.eql(600);
    })

    it('ttl gets a non number value by calling the function it is assigned', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        () => 'abc',
            bufferTtlMsec:  450
        };

        expect(() => new Cache(sampleConfig)).to.throw();
    })

    it('ttl is a negative number', () => {
        const sampleConfig = {
            redisClient,
            ttlMsec:        -1,
            bufferTtlMsec:  450
        };

        expect(() => new Cache(sampleConfig)).to.throw();
    })
});