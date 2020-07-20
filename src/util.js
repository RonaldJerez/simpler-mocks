const cache = require('./cache')

/**
 * Checks that two array contains the same keys
 *
 * @param {Array} setOne
 * @param {Array} setTwo
 * @returns {boolean}
 */
function areEqualSets(setOne, setTwo) {
  if (setOne.length !== setTwo.length) {
    return false
  }

  return !setOne.some((val) => !setTwo.includes(val))
}

/**
 * Transforms the root keys of an object to lowercase
 *
 * @param {object} source the source object
 * @returns {object} the object with keys in lowercase
 */
function keysToLower(source) {
  return Object.keys(source).reduce((result, key) => {
    result[key.toLowerCase()] = source[key]
    return result
  }, {})
}

/**
 * Verbose logging utility function
 */
function log() {
  /* istanbul ignore next */
  if (cache.verbose) {
    console.log.apply(console, arguments)
  }
}

module.exports = {
  areEqualSets,
  keysToLower,
  log
}
