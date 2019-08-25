/**
 * TODO: Explain motivations
 *
 * - Re-run steps as you're implementing them from your editor
 * - Inspect & try code with last context
 * - No need to wait for all the previous steps on each run
 * - Reduces suspicious request on the scraped website
 */

const { runAll, stepRunner } = require('.')

const assignReplContext = (replContext, connector) =>
  Object.assign(replContext, connector.stepsByName, {
    connector,
    context: connector.context, // FIXME: Will it work without mutation?
    run: stepRunner(connector),
    runAll: () => runAll(connector)
  })

/** Start a development REPL.
 *
 * TODO: Turn off *Error Interception* so it doesn't exit.
 *
 * istanbul ignore next
 */
const startRepl = connector => {
  const repl = require('repl')
  const { context: replContext } = repl.start()
  assignReplContext(replContext, connector)
}

// FIXME: Use default export instead of hack?
Object.assign(startRepl, {
  assignReplContext
})
module.exports = startRepl
