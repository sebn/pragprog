const fp = require('./fp')
const { connector } = require('./connector')

// Instanciate in a separate module since it actually runs the connector, so
// we can unit test functions from the actual connector module.
module.exports = fp.instanciate(connector)
