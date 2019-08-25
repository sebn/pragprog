const { assignReplContext } = require('./startRepl')

describe('assignReplContext', () => {
  const replContext = {}
  const connector = { context: {} }
  assignReplContext(replContext, connector)

  test('connector', () => {
    expect(replContext.connector).toEqual(connector)
  })
})
