'use strict';

/* eslint-disable no-unused-vars, no-use-before-define */

const { expect } = require('chai');

const log = require('../logger');

log.level('debug');

const BufferingCache = require('../lib');

describe('buffering cache', () => {
  it('accepts no local cache', () => {
    const remoteCache = {
      store: {
        get: (key) => {
        },
        setpx: (key, value, ttl) => {
        },
        delete: (key) => {
        },
        pttl: (key) => {
        },
        client: {},
      },
      ttl: 60,
      bufferTtl: 30,
    };

    expect(() => new BufferingCache(remoteCache)).to.not.throw();
  });

  it('get value from local cache, not remote or original function', (done) => {
    const remoteArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const remoteCache = {
      store: {
        get: (key) => {
          remoteArgs.get = key;
        },
        setpx: (key, value, ttl) => {
          remoteArgs.setpx.key = key;
          remoteArgs.setpx.ttl = ttl;
          remoteArgs.setpx.value = value;
        },
        delete: (key) => {
          remoteArgs.delete = key;
        },
        pttl: (key) => {
          remoteArgs.ttl = key;
          return ttlMsec;
        },
        client: {},
      },
      ttl: 60,
      bufferTtl: 30,
    };

    const localArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const getValue = 'i got this';
    const ttlMsec = 60;

    const localCache = {
      store: {
        get: (key) => {
          localArgs.get = key;
          return getValue;
        },
        setpx: (key, value, ttl) => {
          localArgs.setpx.key = key;
          localArgs.setpx.ttl = ttl;
          localArgs.setpx.value = value;
        },
        delete: (key) => {
          localArgs.delete = key;
        },
        pttl: (key) => {
          localArgs.ttl = key;
        },
        client: {},
      },
      ttl: 10,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    let functionCalledWith = null;
    const wrappedFunction = bufferingCache.wrapFunction((first) => {
      functionCalledWith = first;
    });

    const functionArg = 'give me this';

    wrappedFunction(functionArg).delay(10).then((value) => {
      expect(value).to.eql(getValue);

      expect(localArgs.get).to.match(new RegExp(functionArg));

      expect(functionCalledWith).to.eql(null);
      expect(remoteArgs.get).to.eql(null);
      expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

      expect(remoteArgs.setpx).to.eql({});
      expect(remoteArgs.delete).to.eql(null);

      expect(localArgs.setpx).to.eql({});
      expect(localArgs.delete).to.eql(null);
      done();
    });
  });

  it('check local cache, get from remote, not get from original function', (done) => {
    const remoteArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const remoteCache = {
      store: {
        get: (key) => {
          remoteArgs.get = key;
          return JSON.stringify({ value: getValue });
        },
        setpx: (key, value, ttl) => {
          remoteArgs.setpx.key = key;
          remoteArgs.setpx.ttl = ttl;
          remoteArgs.setpx.value = value;
        },
        delete: (key) => {
          remoteArgs.delete = key;
        },
        pttl: (key) => {
          remoteArgs.ttl = key;
          return ttlMsec;
        },
        client: {},
      },
      ttl: 60,
      bufferTtl: 30,
    };

    const localArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const getValue = 'i got this';
    const ttlMsec = 60;

    const localCache = {
      store: {
        get: (key) => {
          localArgs.get = key;
        },
        setpx: (key, value, ttl) => {
          localArgs.setpx.key = key;
          localArgs.setpx.ttl = ttl;
          localArgs.setpx.value = value;
        },
        delete: (key) => {
          localArgs.delete = key;
        },
        pttl: (key) => {
          localArgs.ttl = key;
        },
        client: {},
      },
      ttl: 10,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    let functionCalledWith = null;
    const wrappedFunction = bufferingCache.wrapFunction((first) => {
      functionCalledWith = first;
    });

    const functionArg = 'give me this';

    wrappedFunction(functionArg).delay(10).then((value) => {
      expect(value).to.eql(getValue);
      expect(localArgs.get).to.match(new RegExp(functionArg));

      expect(functionCalledWith).to.eql(null);
      expect(remoteArgs.get).to.match(new RegExp(functionArg));
      expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

      expect(remoteArgs.setpx).to.eql({});
      expect(remoteArgs.delete).to.eql(null);

      expect(localArgs.setpx).not.to.eql({});
      expect(localArgs.setpx.key).to.match(new RegExp(functionArg));
      expect(localArgs.setpx.value).to.eql(getValue);
      expect(localArgs.setpx.ttl).to.eql(10);
      expect(localArgs.delete).to.eql(null);
      done();
    });
  });


  it('get value from local cache, mutated by postCallMutator function', (done) => {
    const remoteArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const remoteCache = {
      store: {
        get: (key) => {
          remoteArgs.get = key;
        },
        setpx: (key, value, ttl) => {
          remoteArgs.setpx.key = key;
          remoteArgs.setpx.ttl = ttl;
          remoteArgs.setpx.value = value;
        },
        delete: (key) => {
          remoteArgs.delete = key;
        },
        pttl: (key) => {
          remoteArgs.ttl = key;
          return ttlMsec;
        },
        client: {},
      },
      ttl: 60,
      bufferTtl: 30,
    };

    const localArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const getValue = 33;
    const ttlMsec = 60;

    const localCache = {
      store: {
        get: (key) => {
          localArgs.get = key;
          return getValue;
        },
        setpx: (key, value, ttl) => {
          localArgs.setpx.key = key;
          localArgs.setpx.ttl = ttl;
          localArgs.setpx.value = value;
        },
        delete: (key) => {
          localArgs.delete = key;
        },
        pttl: (key) => {
          localArgs.ttl = key;
        },
        client: {},
      },
      ttl: 10,
    };

    const callMe = (d) => d * 2;

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    let functionCalledWith = null;
    const wrappedFunction = bufferingCache.wrapFunction((first) => {
      functionCalledWith = first;
    }, null, null, callMe);

    const functionArg = 'give me this';

    wrappedFunction(functionArg).delay(10).then((value) => {
      expect(value).to.eql(getValue * 2);

      expect(localArgs.get).to.match(new RegExp(functionArg));

      expect(functionCalledWith).to.eql(null);
      expect(remoteArgs.get).to.eql(null);
      expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

      expect(remoteArgs.setpx).to.eql({});
      expect(remoteArgs.delete).to.eql(null);

      expect(localArgs.setpx).to.eql({});
      expect(localArgs.delete).to.eql(null);
      done();
    });
  });


  it('executes postCallMutator when passed and accessing from remote', (done) => {
    const remoteArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const remoteCache = {
      store: {
        get: (key) => {
          remoteArgs.get = key;
          return JSON.stringify({ value: getValue });
        },
        setpx: (key, value, ttl) => {
          remoteArgs.setpx.key = key;
          remoteArgs.setpx.ttl = ttl;
          remoteArgs.setpx.value = value;
        },
        delete: (key) => {
          remoteArgs.delete = key;
        },
        pttl: (key) => {
          remoteArgs.ttl = key;
          return ttlMsec;
        },
        client: {},
      },
      ttl: 60,
      bufferTtl: 30,
    };

    const localArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const getValue = 33;
    const ttlMsec = 60;

    const localCache = {
      store: {
        get: (key) => {
          localArgs.get = key;
        },
        setpx: (key, value, ttl) => {
          localArgs.setpx.key = key;
          localArgs.setpx.ttl = ttl;
          localArgs.setpx.value = value;
        },
        delete: (key) => {
          localArgs.delete = key;
        },
        pttl: (key) => {
          localArgs.ttl = key;
        },
        client: {},
      },
      ttl: 10,
    };

    const callMe = (d) => d * 2;

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    let functionCalledWith = null;
    const wrappedFunction = bufferingCache.wrapFunction((first) => {
      functionCalledWith = first;
    }, null, 'first', callMe);

    const functionArg = 'give me this';

    wrappedFunction(functionArg).delay(10).then((value) => {
      expect(value).to.eql(getValue * 2);
      // Everything below this is to make sure nothing else changed when we did a thing
      expect(localArgs.get).to.match(new RegExp(functionArg));

      expect(functionCalledWith).to.eql(null);
      expect(remoteArgs.get).to.match(new RegExp(functionArg));
      expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

      expect(remoteArgs.setpx).to.eql({});
      expect(remoteArgs.delete).to.eql(null);

      expect(localArgs.setpx).not.to.eql({});
      expect(localArgs.setpx.key).to.match(new RegExp(functionArg));
      expect(localArgs.setpx.value).to.eql(getValue);
      expect(localArgs.setpx.ttl).to.eql(10);
      expect(localArgs.delete).to.eql(null);
      done();
    });
  });

  it('check local cache, check remote, get from original function, then update caches', (done) => {
    const remoteArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const remoteCache = {
      store: {
        get: (key) => {
          remoteArgs.get = key;
        },
        setpx: (key, value, ttl) => {
          remoteArgs.setpx.key = key;
          remoteArgs.setpx.ttl = ttl;
          remoteArgs.setpx.value = value;
        },
        delete: (key) => {
          remoteArgs.delete = key;
        },
        pttl: (key) => {
          remoteArgs.ttl = key;
          return ttlMsec;
        },
        client: {},
      },
      ttl: 60,
      bufferTtl: 30,
    };

    const localArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    // getValue gets mutated
    const getValue = '1234';
    const ttlMsec = 60;

    const localCache = {
      store: {
        get: (key) => {
          localArgs.get = key;
        },
        setpx: (key, value, ttl) => {
          localArgs.setpx.key = key;
          localArgs.setpx.ttl = ttl;
          localArgs.setpx.value = value;
        },
        delete: (key) => {
          localArgs.delete = key;
        },
        pttl: (key) => {
          localArgs.ttl = key;
        },
        client: {},
      },
      ttl: 10,
    };

    const callMe = (d) => d * 2;

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    let functionCalledWith = null;
    const wrappedFunction = bufferingCache.wrapFunction((first) => {
      functionCalledWith = first;
      return getValue;
    }, null, null, callMe);


    const functionArg = 'give me this';

    wrappedFunction(functionArg).delay(10).then((value) => {
      expect(value).to.eql(getValue * 2);

      expect(localArgs.get).to.match(new RegExp(functionArg));

      expect(functionCalledWith).to.match(new RegExp(functionArg));
      expect(remoteArgs.get).to.match(new RegExp(functionArg));
      expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

      expect(remoteArgs.setpx).not.to.eql({});
      expect(remoteArgs.setpx.key).to.match(new RegExp(functionArg));
      expect(remoteArgs.setpx.value).to.eql(JSON.stringify({ value: getValue }));
      expect(remoteArgs.setpx.ttl).to.eql(60);
      expect(remoteArgs.delete).to.eql(null);

      expect(localArgs.setpx).not.to.eql({});
      expect(localArgs.setpx.key).to.match(new RegExp(functionArg));
      expect(localArgs.setpx.value).to.eql(getValue);
      expect(localArgs.setpx.ttl).to.eql(10);
      expect(localArgs.delete).to.eql(null);
      done();
    });
  });

  it('data not in local or remote cache, has to retrieve from original service AND THEN mutates the data', (done) => {
    const remoteArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const remoteCache = {
      store: {
        get: (key) => {
          remoteArgs.get = key;
        },
        setpx: (key, value, ttl) => {
          remoteArgs.setpx.key = key;
          remoteArgs.setpx.ttl = ttl;
          remoteArgs.setpx.value = value;
        },
        delete: (key) => {
          remoteArgs.delete = key;
        },
        pttl: (key) => {
          remoteArgs.ttl = key;
          return ttlMsec;
        },
        client: {},
      },
      ttl: 60,
      bufferTtl: 30,
    };

    const localArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const getValue = 'i got this';
    const ttlMsec = 60;

    const localCache = {
      store: {
        get: (key) => {
          localArgs.get = key;
        },
        setpx: (key, value, ttl) => {
          localArgs.setpx.key = key;
          localArgs.setpx.ttl = ttl;
          localArgs.setpx.value = value;
        },
        delete: (key) => {
          localArgs.delete = key;
        },
        pttl: (key) => {
          localArgs.ttl = key;
        },
        client: {},
      },
      ttl: 10,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    let functionCalledWith = null;
    const wrappedFunction = bufferingCache.wrapFunction((first) => {
      functionCalledWith = first;
      return getValue;
    });

    const functionArg = 'give me this';

    wrappedFunction(functionArg).delay(10).then((value) => {
      expect(value).to.eql(getValue);

      expect(localArgs.get).to.match(new RegExp(functionArg));

      expect(functionCalledWith).to.match(new RegExp(functionArg));
      expect(remoteArgs.get).to.match(new RegExp(functionArg));
      expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

      expect(remoteArgs.setpx).not.to.eql({});
      expect(remoteArgs.setpx.key).to.match(new RegExp(functionArg));
      expect(remoteArgs.setpx.value).to.eql(JSON.stringify({ value: getValue }));
      expect(remoteArgs.setpx.ttl).to.eql(60);
      expect(remoteArgs.delete).to.eql(null);

      expect(localArgs.setpx).not.to.eql({});
      expect(localArgs.setpx.key).to.match(new RegExp(functionArg));
      expect(localArgs.setpx.value).to.eql(getValue);
      expect(localArgs.setpx.ttl).to.eql(10);
      expect(localArgs.delete).to.eql(null);
      done();
    });
  });

  it('should call function with supplied \'that\'', (done) => {
    const someObject = {
      inner: 10,
      getInner() {
        return this.inner;
      },
      setInner(target) {
        this.inner = target;
      },
    };

    const anotherObject = {
      inner: 10,
      getInner() {
        return this.inner;
      },
      setInner(target) {
        this.inner = target;
      },
    };

    const remoteCache = {
      store: {
        get: (key) => {
        },
        setpx: (key, value, ttl) => {
        },
        delete: (key) => {
        },
        pttl: (key) => ttlMsec,
        client: {},
      },
      ttl: 60,
      bufferTtl: 30,
    };

    const ttlMsec = 60;

    const localCache = {
      store: {
        get: (key) => {
        },
        setpx: (key, value, ttl) => {
        },
        delete: (key) => {
        },
        client: {},
      },
      ttl: 10,
    };

    someObject.setInner(30);

    const bufferingCache = new BufferingCache(remoteCache, localCache);
    const wrappedFunction = bufferingCache.wrapFunction(someObject.getInner, anotherObject);

    expect(someObject.getInner()).to.eql(30);

    wrappedFunction().delay(10).then((value) => {
      expect(value).to.eql(10);
      done();
    });
  });

  it('get value from local cache, attempt to refresh buffer due to low ttl', (done) => {
    const remoteArgs = {
      get: null,
      setpx: {},
      setnx: {},
      delete: null,
      ttl: null,
    };

    const remoteCache = {
      store: {
        get: (key) => {
          remoteArgs.get = key;
        },
        setpx: (key, value, ttl) => {
          remoteArgs.setpx.key = key;
          remoteArgs.setpx.ttl = ttl;
          remoteArgs.setpx.value = value;
        },
        setnx: (key, value, ttl) => {
          remoteArgs.setnx.key = key;
          remoteArgs.setnx.ttl = ttl;
          remoteArgs.setnx.value = value;
          return 'OK';
        },
        delete: (key) => {
          remoteArgs.delete = key;
        },
        pttl: (key) => {
          remoteArgs.ttl = key;
          return ttlMsec;
        },
        client: {},
      },
      ttl: 60,
      bufferTtl: 30,
    };

    const localArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const getValue = 'i got this';
    const ttlMsec = 10;

    const localCache = {
      store: {
        get: (key) => {
          localArgs.get = key;
          return getValue;
        },
        setpx: (key, value, ttl) => {
          localArgs.setpx.key = key;
          localArgs.setpx.ttl = ttl;
          localArgs.setpx.value = value;
        },
        delete: (key) => {
          localArgs.delete = key;
        },
        pttl: (key) => {
          localArgs.ttl = key;
        },
        client: {},
      },
      ttl: 10,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    let functionCalledWith = null;
    const wrappedFunction = bufferingCache.wrapFunction((first) => {
      functionCalledWith = first;
      return `${getValue}_new`;
    });

    const functionArg = 'give me this';

    wrappedFunction(functionArg).delay(10).then((value) => {
      expect(value).not.to.eql(`${getValue}_new`);
      expect(value).to.eql(getValue);

      expect(localArgs.get).to.match(new RegExp(functionArg));

      expect(functionCalledWith).to.match(new RegExp(functionArg));
      expect(remoteArgs.get).to.eql(null);
      expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

      expect(remoteArgs.setpx).not.to.eql({});
      expect(remoteArgs.setpx.key).to.match(new RegExp(functionArg));
      expect(remoteArgs.setpx.value).to.eql(JSON.stringify({ value: `${getValue}_new` }));
      expect(remoteArgs.setpx.ttl).to.eql(60);
      expect(remoteArgs.delete).to.match(new RegExp(`${functionArg}.*refresh`));

      expect(localArgs.setpx).not.to.eql({});
      expect(localArgs.setpx.key).to.match(new RegExp(functionArg));
      expect(localArgs.setpx.value).to.eql(`${getValue}_new`);
      expect(localArgs.setpx.ttl).to.eql(10);
      expect(localArgs.delete).to.eql(null);
      done();
    });
  });

  it('get value from local cache, attempt to refresh buffer, but not get lock', (done) => {
    const remoteArgs = {
      get: null,
      setpx: {},
      setnx: {},
      delete: null,
      ttl: null,
    };

    const remoteCache = {
      store: {
        get: (key) => {
          remoteArgs.get = key;
        },
        setpx: (key, value, ttl) => {
          remoteArgs.setpx.key = key;
          remoteArgs.setpx.ttl = ttl;
          remoteArgs.setpx.value = value;
        },
        setnx: (key, value, ttl) => {
          remoteArgs.setnx.key = key;
          remoteArgs.setnx.ttl = ttl;
          remoteArgs.setnx.value = value;
          return 'NOT_OK';
        },
        delete: (key) => {
          remoteArgs.delete = key;
        },
        pttl: (key) => {
          remoteArgs.ttl = key;
          return ttlMsec;
        },
        client: {},
      },
      ttl: 60,
      bufferTtl: 30,
    };

    const localArgs = {
      get: null,
      setpx: {},
      delete: null,
      ttl: null,
    };

    const getValue = 'i got this';
    const ttlMsec = 10;

    const localCache = {
      store: {
        get: (key) => {
          localArgs.get = key;
          return getValue;
        },
        setpx: (key, value, ttl) => {
          localArgs.setpx.key = key;
          localArgs.setpx.ttl = ttl;
          localArgs.setpx.value = value;
        },
        delete: (key) => {
          localArgs.delete = key;
        },
        pttl: (key) => {
          localArgs.ttl = key;
        },
        client: {},
      },
      ttl: 10,
    };

    const bufferingCache = new BufferingCache(remoteCache, localCache);

    let functionCalledWith = null;
    const wrappedFunction = bufferingCache.wrapFunction((first) => {
      functionCalledWith = first;
      return getValue;
    });

    const functionArg = 'give me this';

    wrappedFunction(functionArg).delay(10).then((value) => {
      expect(value).to.eql(getValue);

      expect(localArgs.get).to.match(new RegExp(functionArg));

      expect(functionCalledWith).to.eql(null);
      expect(remoteArgs.get).to.eql(null);
      expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

      expect(remoteArgs.setpx).to.eql({});
      expect(remoteArgs.delete).to.eql(null);

      expect(localArgs.setpx).to.eql({});
      expect(localArgs.delete).to.eql(null);
      done();
    });
  });
});
