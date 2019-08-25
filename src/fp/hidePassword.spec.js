const fp = require('.')
const hidePassword = require('./hidePassword')

describe('fp/hidePassword', () => {
  let password, fields

  beforeEach(() => {
    password = 'secret' // TODO: Use random password
    fields = { password }
  })

  describe('when used as the first step of a connector', () => {
    let connector, scrapedData

    beforeEach(async () => {
      scrapedData = { some: 'data' } // TODO: Use random data
      const someStep = () => scrapedData
      connector = fp.connector({
        initial: {
          fields,
          steps: [hidePassword, someStep]
        }
      })
      await fp.runAll(connector)
    })

    it('does not prevent other steps from working', () => {
      expect(connector.context.data).toEqual(scrapedData)
    })

    it('ensures password is not visible directly when inspecting context', () => {
      expect(JSON.stringify(connector.context)).not.toContain(password)
    })

    it('can still be unwrapped on demande', () => {
      expect(connector.context.fields.password()).toEqual(password)
    })
  })
})
