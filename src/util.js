const cache = require('./cache')

/**
 * Parses a string of options into an object or its true type
 *
 * @example "name:test, name2:1|2|3" -> {name: test, name2: [1, 2, 3]}
 * @param {string} str
 * @returns {mixed}
 */
function parseOptions(str) {
  const arr = str.split(',')

  return arr.reduce((options, option) => {
    const [key, val] = option.split(':')
    if (val) {
      options[key.trim()] = parseValue(val.trim())
    } else {
      options = parseValue(key.trim())
    }
    return options
  }, {})
}

/**
 * Parses a string to its true value
 * if 'true'/'false' = true/false
 * if a string seperated by pipes '|' turns it into an array
 *
 * @param {string} str
 * @returns {mixed}
 */
function parseValue(str) {
  if (str === 'true') return true
  else if (str === 'false') return false
  else if (str.indexOf('|') > 0) return str.split('|')
  else return str
}

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
  log,
  parseOptions
}
