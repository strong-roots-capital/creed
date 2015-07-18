import { settle, resolve, reject } from '../src/Promise';
import { isFulfilled, isRejected } from '../src/inspect';
import assert from 'assert';

describe('settle', () => {

    it('should settle empty iterable', () => {
        return settle(new Set()).then(a => {
            assert.equal(a.length, 0);
        });
    });

    it('should settle promises', () => {
        let s = new Set([1, resolve(2), reject(3)]);
        return settle(s).then(a => {
            assert.equal(a.length, s.size);
            assert(isFulfilled(a[0]));
            assert(isFulfilled(a[1]));
            assert(isRejected(a[2]));
        });
    });

});