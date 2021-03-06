import { describe, it } from 'mocha'
import { eq, fail, is } from '@briancavalier/assert'

import ErrorHandler from '../src/ErrorHandler'
import { HANDLED } from '../src/state'
import { reject } from '../src/Promise'

describe('ErrorHandler', () => {
  describe('track', () => {
    it('should emit event immediately', () => {
      const value = {}
      const expected = reject(value)

      function verify (event, e, error) {
        is(e, expected)
        is(error, value)
        return true
      }

      const eh = new ErrorHandler(verify, fail)
      eh.track(expected)
    })

    it('should report error later', done => {
      const value = {}
      const expected = reject(value)
      function verify (e) {
        is(e, expected)
        is(e.value, value)
        done()
      }

      const eh = new ErrorHandler(() => false, verify)
      eh.track(expected)
    })
  })

  describe('untrack', () => {
    it('should emit event immediately', () => {
      const value = {}
      const expected = reject(value)

      function verify (event, e) {
        is(e, expected)
        is(e.value, value)
        return true
      }

      const eh = new ErrorHandler(verify, fail)
      eh.untrack(expected)
    })

    it('should silence error', () => {
      const value = {}
      const expected = reject(value)

      const eh = new ErrorHandler(() => true, fail)
      eh.untrack(expected)

      eq(expected.state() & HANDLED, HANDLED)
    })
  })
})
