/** Write functional-style connectors.
 *
 * This module helps writing connectors in a way that separates pure functions
 * (computations, decision-making) from side-effectful ones (request).
 *
 * ## Steps
 *
 * The connector is decomposed in successive steps. Steps are plain functions
 * always taking the same arguments:
 *
 * - `context`: a map-like `Object` that will be passed between steps and
 *   progressively modified to accumulate useful info.
 * - additional parameters (see below)
 *
 * ## Context
 *
 * The context has the following keys:
 *
 * - `cozyParameters` (mandatory): TODO
 * - `data` (mandatory): a map-like `Object` used to accumulate scraped data.
 * - `fields` (mandatory): connector fields configured from the Cozy.
 * - `steps` (mandatory): an Array of the next steps to be run.
 * - `$` (optional): a cheerio object for the last visited page.
 *
 * Other keys may be added when relevant (see `connector()`).
 *
 * ## Requesting a page
 *
 * Just return the result of the `request` function directly:
 *
 * ```
 * const requestSomePage = () =>
 *   request('https://whatever.test/page')
 * ```
 *
 * The resulting cheerio object will be available to the next steps from the
 * `context` at the `$` key.
 *
 * The side-effect is isolated in a single step, so subsequent ones can be
 * pure functions.
 *
 * ## Scraping data from a page
 *
 * TODO
 *
 * ```
 * const parseSomeData = ({ $ }) =>
 *   scrape(
 *     $,
 *     {
 *       title: 'h3',
 *       amount: '.amount',
 *       fileurl: '.file'
 *     },
 *     '.item'
 *   )
 * ```
 *
 * ## Deciding next steps according to scraped data
 *
 * TODO
 *
 * ```
 * const decideWhatIsNext = ({ data }) => [
 *   ['someStep', 'arg1', 'arg2'],
 *   ['someStep', 'argA', 'argB']
 * ]
 * ```
 *
 * ## TODO: More documentation, motivations...
 */

const { BaseKonnector, log } = require('cozy-konnector-libs')

const { NODE_ENV } = process.env

// TODO: Separate registration from resolution
const resolveOrRegisterStep = (stepsByName, step) => {
  if (step instanceof Function) {
    stepsByName[step.name] = step
  }
  const stepName = step.name || step
  const stepFn = stepsByName[stepName]
  if (stepFn) {
    return stepFn
  } else {
    throw new Error(
      `No step with name ${JSON.stringify(stepName)}. Known steps:\n` +
        JSON.stringify(stepsByName, null, 2)
    )
  }
}

/** Build a new functional-style connector.
 *
 * Those connectors are implemented as plain JS data Object instead of
 * subclassing / instanciating `BaseKonnector`.
 *
 * It makes them easier to inspect in REPL and prevents conflicts with future
 * `BaseKonnector` changes.
 *
 * See `fp.instanciate()` for compatibility.
 */
const connector = ({ initial, stepsByName }) => {
  const context = { data: {}, ...initial, steps: [] }
  stepsByName = stepsByName || {}

  initial.steps.forEach(step => {
    context.steps.push([step.name])
    stepsByName[step.name] = step
  })

  return { context, stepsByName }
}

/** Merge the output of a step back in the input context.
 *
 * FIXME: Found non-callable @@iterator
 */
const mergeInContext = (context, stepResult) => {
  if (stepResult == null) {
    // Step was skipped for whatever reason.
  } else if (stepResult.html) {
    context.$ = stepResult
  } else if (stepResult instanceof Array) {
    context.steps = stepResult.concat(context.steps)
  } else {
    // Assuming data.
    context.data = stepResult
  }
}

const logStep = (stepName, stepArgs) => {
  if (NODE_ENV !== 'test') {
    log(
      'debug',
      '[STEP] ' + [stepName, ...stepArgs.map(JSON.stringify)].join(' ')
    )
  }
}

/** Build a Function to run a step with the given connector.
 *
 * TODO: explain motivations
 *
 * - Allowing step Function works well with REPL completion
 */
const stepRunner = ({ context, stepsByName }) => async (step, ...stepArgs) => {
  const stepFn = resolveOrRegisterStep(stepsByName, step)
  logStep(stepFn.name, stepArgs)
  const stepResult = await stepFn(context, ...stepArgs)
  mergeInContext(context, stepResult)
}

/** Run all the connector steps until no more remains. */
const runAll = async connector => {
  const run = stepRunner(connector)
  // eslint-disable-next-line
  while (true) {
    const nextStep = connector.context.steps.shift()
    if (nextStep != null) {
      await run(...nextStep)
    } else {
      break
    }
  }
}

/** Turn a functional-style connector into a proper BaseKonnector instance. */
const instanciate = connector =>
  new BaseKonnector(async (fields, cozyParameters) => {
    Object.assign(connector.context, { cozyParameters, fields })
    await runAll(connector)
  })

module.exports = {
  connector,
  instanciate,
  runAll,
  stepRunner
}
