const Promise  = require('bluebird');
const chai   = require('chai');
const expect = chai.expect;

const log = require('../logger');
log.level('debug');

const BufferingCache = require('../lib');

describe('buffering cache', () => {
  it('accepts no local cache', () => {
    const remoteCache = {
      store:        {
        get:    (key) => {},
        setex:  (key, ttl, value) => {},
        delete: (key) => {},
        ttl:    (key) => {}
      },
      ttl:          60,
      bufferFactor: 0.5
    };

    new BufferingCache(remoteCache);
  });

  it('get value from local cache, not remote or original function', (done) => {
    const remoteArgs = {
      get: null,
      setex: {},
      delete: null,
      ttl: null
    };

    const remoteCache = {
      store:        {
        get:    (key) => {
          remoteArgs.get = key;
        },
        setex:  (key, ttl, value) => {
          remoteArgs.setex.key = key;
          remoteArgs.setex.ttl = ttl;
          remoteArgs.setex.value = value;
        },
        delete: (key) => {
          remoteArgs.delete = key;
        },
        ttl:    (key) => {
          remoteArgs.ttl = key;
          return ttl;
        }
      },
      ttl:          60,
      bufferFactor: 0.5
    };

    const localArgs = {
      get: null,
      setex: {},
      delete: null,
      ttl: null
    };

    const getValue = 'i got this';
    const ttl = 60;

    const localCache = {
      store:        {
        get:    (key) => {
          localArgs.get = key;

          // Have to check expectations after some delay to ensure nothing else was called
          setTimeout(() => {
            expect(localArgs.get).to.match(new RegExp(functionArg));
            expect(remoteArgs.ttl).to.match(new RegExp(functionArg));
            expect(remoteArgs.get).to.eql(null);
            expect(functionCalledWith).to.eql(null);
            done();
          }, 10);
          return getValue;
        },
        setex:  (key, ttl, value) => {
          localArgs.setex.key = key;
          localArgs.setex.ttl = ttl;
          localArgs.setex.value = value;
        },
        delete: (key) => {
          localArgs.delete = key;
        },
        ttl:    (key) => {
          localArgs.ttl = key;
        }
      },
      ttl:          60,
      bufferFactor: 0.5
    };

    const buffreingCache = new BufferingCache(remoteCache, localCache);

    let functionCalledWith = null;
    const wrappedFunction = buffreingCache.wrapFunction((first) => {
      functionCalledWith = first;
    });

    const functionArg = 'give me this';

    wrappedFunction(functionArg);
  });

  it('gets value from remote cache, not local or original function', (done) => {
    const remoteArgs = {
      get: null,
      setex: {},
      delete: null,
      ttl: null
    };

    const remoteCache = {
      store:        {
        get:    (key) => {
          remoteArgs.get = key;
        },
        setex:  (key, ttl, value) => {
          remoteArgs.setex.key = key;
          remoteArgs.setex.ttl = ttl;
          remoteArgs.setex.value = value;
        },
        delete: (key) => {
          remoteArgs.delete = key;
        },
        ttl:    (key) => {
          remoteArgs.ttl = key;
          return ttl;
        }
      },
      ttl:          60,
      bufferFactor: 0.5
    };

    const localArgs = {
      get: null,
      setex: {},
      delete: null,
      ttl: null
    };

    const getValue = 'i got this';
    const ttl = 60;

    const localCache = {
      store:        {
        get:    (key) => {
          localArgs.get = key;

          // Have to check expectations after some delay to ensure nothing else was called
          setTimeout(() => {
            expect(localArgs.get).to.match(new RegExp(functionArg));
            expect(remoteArgs.ttl).to.match(new RegExp(functionArg));
            expect(remoteArgs.get).to.eql(null);
            expect(functionCalledWith).to.eql(null);
            done();
          }, 10);
          return getValue;
        },
        setex:  (key, ttl, value) => {
          localArgs.setex.key = key;
          localArgs.setex.ttl = ttl;
          localArgs.setex.value = value;
        },
        delete: (key) => {
          localArgs.delete = key;
        },
        ttl:    (key) => {
          localArgs.ttl = key;
        }
      },
      ttl:          60,
      bufferFactor: 0.5
    };

    const buffreingCache = new BufferingCache(remoteCache, localCache);

    let functionCalledWith = null;
    const wrappedFunction = buffreingCache.wrapFunction((first) => {
      functionCalledWith = first;
    });

    const functionArg = 'give me this';

    wrappedFunction(functionArg);
  });
});