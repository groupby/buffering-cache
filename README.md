# buffering-cache
Cache a little cold? Cache misses slowing you down?

`buffering-cache` keeps your cache warm asynchronously. Minimizing cache misses and keeping the entries from becoming stale.

## Installation:
```bash
npm install --save buffering-cache
```

## Use:
```javascript
const BufferingCache = require('buffering-cache');
const rp = require('request-promise');

const bufferingCache = new BufferingCache({
  host: 'localhost',
  port: 6379,
  ttlMsec: 5000
});

const rawFunction = () => rp('http://www.google.com');

const bufferedAndCachedFunction = bufferingCache.wrapFunction(rawFunction);

bufferedAndCachedFunction()
.then((response) => {
  // No cache yet
  // 'response' returned after round-trip to google.com. 
  return bufferedAndCachedFunction();
})
.delay(3000) // Wait a bit 
.then(() => {
  // Cache still 
})
```

