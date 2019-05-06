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
 * Checks a criteria's value against a particular tester
 *
 * @param {*} val the value we got from the request
 * @param {*} tester the tester (regexp or function)
 */
function criteriaTester(val, tester) {
  if (tester instanceof Any) {
    if (!tester.type) {
      // when no type is specify, we dont care for the actual value
      return true
    } else if (tester.type === 'array') {
      return Array.isArray(val)
    } else {
      return typeof val === tester.type
    }
  } else if (tester instanceof RegExp) {
    return tester.test(val)
  } else if (typeof tester === 'function') {
    return tester(val)
  }
}

// the Any class to be used for the custom !any tag
// type = boolean|string|number|array
function Any(type) {
  if (type) {
    this.type = type.toLowerCase()
  }
}

/**
 * Verbose logging utility function
 */
function log() {
  if (cache.verbose) {
    console.log.apply(console, arguments)
  }
}

module.exports = {
  Any,
  areEqualSets,
  criteriaTester,
  keysToLower,
  log,
  parseOptions
}
