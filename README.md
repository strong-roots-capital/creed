[![Build Status](https://travis-ci.org/briancavalier/creed.svg?branch=master)](https://travis-ci.org/briancavalier/creed)

# creed

Creed is a forward-looking promise toolkit.  It favors intuitiveness, productivity, and developer happiness. It has a small, focused API, makes uncaught errors obvious by default, and supports ES2105 features.

* [Try it](#try-it)
* [Get it](#get-it)
* [API docs](#api)
* [Debugging](#debugging)

## Get it

`npm install --save creed` or `bower install --save creed` or download from the [`dist/` folder](dist).

```js
// Babel ES2015
import { resolve, reject, all, ... } from 'creed';

// CommonJS
var creed = require('creed');

// AMD
define(['creed'], function(creed) { ... });
```

```html
<script src="creed/dist/creed.js"></script>
```

## Try it

Creed is REPL friendly, with instant and obvious feedback. [Try it out in JSBin](https://jsbin.com/muzoba/edit?js,console) or [using ES2015 with babel](https://jsbin.com/faxene/edit?js,console), or try it in a node REPL:

```
npm install creed
node
> var creed = require('creed');
undefined
> creed.resolve('hello');
Promise { fulfilled: hello }
> creed.all([1, 2, 3].map(creed.resolve));
Promise { fulfilled: 1,2,3 }
> var p = creed.delay(1000, 'done!'); p
Promise { pending }
... wait 1 second ...
> p
Promise { fulfilled: done! }
> creed.race([creed.delay(100, 'no'), 'winner']);
Promise { fulfilled: winner }
```

## API

## Make a promise

### co

####`co :: Generator a -> (...args -> Promise a)`

Create an async coroutine from a generator and `yield`.

```js
import { co } from 'creed';

function fetchTextFromUrl(url) {
    // ...
    return promise;
}

// Declare an async coroutine from a generator
let getUserProfile = co(function* (user) {
    try {
        let profileUrl = yield getUserProfileUrlFromDB(user);
        let text = yield fetchTextFromUrl(profileUrl);
        return text;
    } catch(e) {
        return getDefaultText();
    }
});

// Call it like a function
let user = ...;
getUserProfile(user)
    .then(profile => console.log(profile));
```

### node

####`node :: (...args -> (err -> a)) -> (...args -> Promise a)`

Turn a Node-style API into a promised API.

```js
import { node } from 'creed';
import { readFile } from 'fs';

// Make a promised version of fs.readFile
let readFileP = node(readFile);

readFileP('theFile.txt', 'utf8')
    .then(String) // fs.readFile returns a Buffer, transform to a String
    .then(contents => console.log(contents));
```

### promise

####`promise :: (...args -> (a -> ()) -> (err -> ()) -> ...args -> Promise a`

Run a function to produce a promised result.

```js
import { promise } from 'creed';

// Run a function, threading in a url parameter
let p = promise((url, resolve, reject) => {
    var xhr = new XMLHttpRequest;
    xhr.addEventListener("error", reject);
    xhr.addEventListener("load", resolve);
    xhr.open("GET", url);
    xhr.send(null);
}, 'http://...'); // inject url parameter

p.then(result => console.log(result));
```

Parameter threading also makes it easy to create reusable tasks that don't rely on closures and scope chain capturing.

```js
import { promise } from 'creed';

function xhrGet(url, resolve, reject) => {
    var xhr = new XMLHttpRequest;
    xhr.addEventListener("error", reject);
    xhr.addEventListener("load", resolve);
    xhr.open("GET", url);
    xhr.send(null);
}

promise(xhrGet, 'http://...')
    .then(result => console.log(result));
```

## Transform

### then

####`then :: Promise a -> (a -> b|Promise b) -> Promise b`

[Promises/A+ then](http://promisesaplus.com/)

Transform a promise's value by applying a function to the promise's fulfillment value. Returns a new promise for the transformed result.

```
p:                ---1
p.then(x => x+1): ---2

p:                          ---1
p.then(x => delay(3, x+1)): ------2

p:         ---X
p.then(f): ---X
```

## Handle errors

### catch

####`catch :: Promise a -> (err -> b|Promise b) -> Promise b`

Handle a promise error.

```
p:               ---X
p.catch(e => 1): ---1

p:                        ---X
p.catch(x => delay(3, 1)): ------1

p:          ---a
p.catch(f): ---a
```

```

## Control time

### timeout

####`timeout :: Milliseconds -> a|Promise a -> Promise a`

Reject a promise if it doesn't settle within a particular time.

```
p1:             ---a
timeout(5, p1): ---a

p2:             -----a
timeout(3, p2): --X
```

```js
import { timeout } from 'creed';
import rest from 'rest';

function getContentWithTimeout(url) {
    return timeout(1000, rest(url));
}

let content = getContentWithTimeout('http://...');
```

### delay

####`delay :: Milliseconds -> a|Promise a -> Promise a`

Make a promise that reveals it's fulfillment after a delay.  Rejections are not delayed.

```
p1:           ---a
delay(5, p1): --------a

p2:           ---X
delay(5, p2): ---X
```

```js
import { delay } from 'creed';

delay(1000, 'hi')
    .then(x => console.log(x)); // 'hi' after 1 second
    

function countdown(x) {
    console.log(x);
    
    return x === 0 ? x : delay(1000, x-1).then(countdown);
}

countdown(3);
```

```js
3 // immediately
2 // after 1 second
1 // after 2 seconds
0 // after 3 seconds
```

## Resolve collections

Creed's collection methods accept ES6 Iterables.  You can pass an Array, a Set, a Generator, etc. of promises.

### all

####`all :: Iterable Promise a -> Promise Array a`

Create a promise that fulfills when all input promises have fulfilled, or rejects when *one* input promise rejects.

```
p1:                --a
p2:                ------b
p3:                ----c
all([p1, p2, p3]): ------[a,b,c]

p1:                --a
p2:                ------b
p3:                ----X
all([p1, p2, p3]): ----X
```

```js
import { all, resolve } from 'creed';

let s = new Set();
s.add(resolve(1));
s.add(resolve(2));
s.add(resolve(3));

all(s).then(array => console.log(array)); // 1,2,3
```

```js
import { all, resolve } from 'creed';

function* yieldSomePromises() {
    yield resolve(1);
    yield resolve(2);
    yield resolve(3);
}

all(yieldSomePromises())
    .then(array => console.log(array)); // 1,2,3
```

### race

####`race :: Iterable Promise a -> Promise a`

A competitive race to settle. The returned promise will settle in the same way as the earliest promise in array to settle.

```
p1:                 --a
p2:                 ------X
p3:                 ----c
race([p1, p2, p3]): --a

p1:                 --X
p2:                 ------b
p3:                 ----c
race([p1, p2, p3]): --X

race([]):           ------->
```

```js
import { race, resolve, delay } from 'creed';

let a = [
    delay(100, 1),
    resolve(2),
    delay(200, 3)
];

race(a).then(x => console.log(x)); // 2
```

### any

####`any :: Iterable Promise a -> Promise a`

Create a promise that fulfills when the earliest input promise fulfills, or rejects when all input promises have rejected.

```
p1:                --X
p2:                ------b
p3:                ----c
any([p1, p2, p3]): ----c

p1:                --X
p2:                ------X
p3:                ----X
any([p1, p2, p3]): ------X

any([]):           X
```

```js
import { any } from 'creed';

let a = [
    reject(new Error('fail 1')),
    delay(100, 2),
    reject(new Error('fail 3')),
];

any(a).then(x => console.log(x)); // 2
```

### settle

####`settle :: Iterable Promise a -> Promise Array Promise a`

Create a promise that fulfills with an array of settled promises whose state and value can be inspected synchronously.

```
p1:                --a
p2:                ------b
p3:                ----c
all([p1, p2, p3]): ------[a,b,c]

p1:                --a
p2:                ------b
p3:                ----X
all([p1, p2, p3]): ----X
```

```js
import { settle, resolve, reject, isFulfilled, getValue } from 'creed';

let a = [reject(1), 2, resolve(3), reject(4)];

settle(a).then(array => {
    
    let fulfilled = array.filter(isFulfilled);
    
    for(let p of fulfilled) {
        console.log(getValue(p));
    }
    
});
```

## Debugging

*TODO*