const fp = require('.')

describe('fp', () => {
  // TODO: fp module unit tests

  describe('connector', () => {
    it('has stepsByName', () => {
      const connector = fp.connector({ initial: { steps: [] } })
      expect(connector.stepsByName).toEqual({})
    })
  })
})
