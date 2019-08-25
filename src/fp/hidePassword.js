/** Wrap password in a Function so it doesn't show up in console.
 *
 * Can be used as the first step of a functional-style connector.
 *
 * Make sure you unwrap the password, e.g. on signin.
 */
const hidePassword = ({ fields }) => {
  const { password } = fields
  fields.password = () => password
}

module.exports = hidePassword
