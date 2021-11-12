const chai    = require('chai');
const expect  = chai.expect;

const log = require('../logger');
log.level('debug');

const BufferingCache = require('../lib');

describe('buffering cache', () => {
    it('accepts no local cache', () => {
        const remoteCache = {
            store: {
                get:    (key) => {},
                setpx:  (key, value, ttl) => {},
                delete: (key) => {},
                pttl:   (key) => {},
                client: {}
            },
            ttl:       60,
            bufferTtl: 30
        };

        new BufferingCache(remoteCache);
    });

    it('get from remote, not get from original function', (done) => {
        const remoteArgs = {
            get:    null,
            setpx:  {},
            delete: null,
            ttl:    null
        };

        const remoteCache = {
            store: {
                get: (key) => {
                    remoteArgs.get = key;
                    return JSON.stringify({value: getValue});
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
                client: {}
            },
            ttl:       60,
        };

        const getValue = 'i got this';
        const ttlMsec      = 60;

        const bufferingCache = new BufferingCache(remoteCache);

        let functionCalledWith = null;
        const wrappedFunction  = bufferingCache.wrapFunction((first) => {
            functionCalledWith = first;
        });

        const functionArg = 'give me this';

        wrappedFunction(functionArg).delay(10).then((value) => {
            expect(value).to.eql(getValue);
        
            expect(functionCalledWith).to.eql(null);
            expect(remoteArgs.get).to.match(new RegExp(functionArg));
            expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

            expect(remoteArgs.setpx).to.eql({});
            expect(remoteArgs.delete).to.eql(null);

            done();
        });
    });

    it('executes postCallMutator when passed and accessing from remote', (done) => {
        const remoteArgs = {
            get:    null,
            setpx:  {},
            delete: null,
            ttl:    null
        };

        const remoteCache = {
            store: {
                get: (key) => {
                    remoteArgs.get = key;
                    return JSON.stringify({value: getValue});
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
                client: {}
            },
            ttl:       60,
            bufferTtl: 30
        };

        const getValue = 33;
        const ttlMsec      = 60;

        const callMe = (d) => {
            return d * 2;
        };

        const bufferingCache = new BufferingCache(remoteCache);

        let functionCalledWith = null;
        const wrappedFunction  = bufferingCache.wrapFunction((first) => {
            functionCalledWith = first;
        }, null, 'first', callMe);

        const functionArg = 'give me this';

        wrappedFunction(functionArg).delay(10).then((value) => {
            expect(value).to.eql(getValue * 2);
      //Everything below this is to make sure nothing else changed when we did a thing
            
            expect(functionCalledWith).to.eql(null);
            expect(remoteArgs.get).to.match(new RegExp(functionArg));
            expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

            expect(remoteArgs.setpx).to.eql({});
            expect(remoteArgs.delete).to.eql(null);

            done();
        });
    });

    it('check remote, get from original function, then update caches', (done) => {
        const remoteArgs = {
            get:    null,
            setpx:  {},
            delete: null,
            ttl:    null
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
                client: {}
            },
            ttl:       60,
            bufferTtl: 30
        };

    //getValue gets mutated
        const getValue = '1234';
        const ttlMsec      = 60;

        const callMe = (d) => {
            return d * 2;
        };

        const bufferingCache = new BufferingCache(remoteCache, localCache);

        let functionCalledWith = null;
        const wrappedFunction  = bufferingCache.wrapFunction((first) => {
            functionCalledWith = first;
            return getValue;
        }, null, null, callMe);


        const functionArg = 'give me this';

        wrappedFunction(functionArg).delay(10).then((value) => {
            expect(value).to.eql(getValue * 2);

            expect(functionCalledWith).to.match(new RegExp(functionArg));
            expect(remoteArgs.get).to.match(new RegExp(functionArg));
            expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

            expect(remoteArgs.setpx).not.to.eql({});
            expect(remoteArgs.setpx.key).to.match(new RegExp(functionArg));
            expect(remoteArgs.setpx.value).to.eql(JSON.stringify({value: getValue}));
            expect(remoteArgs.setpx.ttl).to.eql(60);
            expect(remoteArgs.delete).to.eql(null);

            done();
        });
    });

    it('data not in remote cache, has to retrieve from original service AND THEN mutates the data', (done) => {
        const remoteArgs = {
            get:    null,
            setpx:  {},
            delete: null,
            ttl:    null
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
                client: {}
            },
            ttl:       60,
        };

        const getValue = 'i got this';
        const ttlMsec      = 60;

        const bufferingCache = new BufferingCache(remoteCache);

        let functionCalledWith = null;
        const wrappedFunction  = bufferingCache.wrapFunction((first) => {
            functionCalledWith = first;
            return getValue;
        });

        const functionArg = 'give me this';

        wrappedFunction(functionArg).delay(10).then((value) => {
            expect(value).to.eql(getValue);

            expect(functionCalledWith).to.match(new RegExp(functionArg));
            expect(remoteArgs.get).to.match(new RegExp(functionArg));
            expect(remoteArgs.ttl).to.match(new RegExp(functionArg));

            expect(remoteArgs.setpx).not.to.eql({});
            expect(remoteArgs.setpx.key).to.match(new RegExp(functionArg));
            expect(remoteArgs.setpx.value).to.eql(JSON.stringify({value: getValue}));
            expect(remoteArgs.setpx.ttl).to.eql(60);
            expect(remoteArgs.delete).to.eql(null);

            done();
        });
    });

    it('should call function with supplied \'that\'', (done) => {
        const someObject = {
            inner:    10,
            getInner: function() {
                return this.inner;
            },
            setInner: function(target) {
                this.inner = target;
            }
        };

        const anotherObject = {
            inner:    10,
            getInner: function() {
                return this.inner;
            },
            setInner: function(target) {
                this.inner = target;
            }
        };

        const remoteCache = {
            store: {
                get:    (key) => {},
                setpx:  (key, value, ttl) => {},
                delete: (key) => {},
                pttl:   (key) => ttlMsec,
                client: {}
            },
            ttl:       60,
            bufferTtl: 30
        };

        const ttlMsec      = 60;

        someObject.setInner(30);

        const bufferingCache = new BufferingCache(remoteCache);
        const wrappedFunction  = bufferingCache.wrapFunction(someObject.getInner, anotherObject);

        expect(someObject.getInner()).to.eql(30);

        wrappedFunction().delay(10).then((value) => {
            expect(value).to.eql(10);
            done();
        });
    });

});