const fs = require('fs')
const { promisify } = require('util')
const path = require('path')
const yaml = require('js-yaml')
const globby = require('globby')
const isMatch = require('lodash.ismatchwith')
const isEqual = require('lodash.isequalwith')

const SCHEMA_KEYS = {
  delay: ':delay',
  conditions: ':conditions',
  status: ':status',
  headers: ':headers',
  response: ':response'
}

const readFileAsync = promisify(fs.readFile)

/**
 * Determines if a particular mock exist in our mocks directory, based on the request URL and method
 *
 * @param {*} mocksDirectory the directory where to mocks are located
 * @param {*} url the request URL
 * @param {*} method the request method used
 * @return {String} the filename that matches this request
 */
async function getFileName(mocksDirectory, url, method) {
  // remove the leading or trailing '/', otherwise resolve will
  // make the path absolute from the value of url
  let name = url.replace(/^\/+|\/+$/g, '')
  name = name ? name : 'index'
  const ext = `.${method.toLowerCase()}.(yaml|yml|json)`
  const fileGlob = path.resolve(mocksDirectory, name + ext)

  const files = await globby(fileGlob)
  if (files.length > 0) {
    return files[0]
  }
}

/**
 * loads the mock config from the specified file
 *
 * @param {*} fileName the YAML file with the mock's config
 * @returns {Array} an array containing the mock file definition(s)
 */
async function loadMockFile(fileName) {
  let content

  if (fileName) {
    const file = await readFileAsync(fileName, 'utf8')

    try {
      content = yaml.load(file)
      if (content && !Array.isArray(content)) {
        content = [content]
      }
    } catch (error) {
      /* istanbul ignore next */
      console.error(error.message)
    }
  }

  return content
}

/**
 * Checks if a given mock has some schema definition
 *
 * @private
 * @param {*} mock the mock file config
 * @returns {boolean}
 */
function mockHasSchema(mock) {
  if (Array.isArray(mock) || typeof mock === 'string') {
    return false
  }

  const keys = Object.values(SCHEMA_KEYS)
  return Object.keys(mock).some((key) => keys.includes(key))
}

/**
 * Responds to the request
 *
 * @param {object} ctx Koa context object
 * @param {*} mock the mock file config
 * @returns
 */
function respond(ctx, mock) {
  if (!mockHasSchema(mock)) {
    ctx.body = mock
    return
  }

  if (mock[SCHEMA_KEYS.status]) ctx.status = mock[SCHEMA_KEYS.status]
  if (mock[SCHEMA_KEYS.headers]) ctx.set(mock[SCHEMA_KEYS.headers])
  if (mock[SCHEMA_KEYS.response]) ctx.body = mock[SCHEMA_KEYS.response]
}

/**
 * Checks if a given mock's conditions is met by the http request
 *
 * @param {object} req Koa's request object
 * @param {*} mock the mock file config to check
 * @returns {boolean}
 */
function requestMeetsConditions(req, mock) {
  // abdance of conditions means the request matches the mock
  if (!mockHasSchema(mock) || mock[SCHEMA_KEYS.conditions] === undefined) {
    return true
  }

  const conditions = mock[SCHEMA_KEYS.conditions]
  if (conditions === 'skip') return false

  // if any fail, its not a match
  for (const condition in conditions) {
    const [section, ...modifiers] = condition.split('.')
    let criterias = conditions[condition]

    // make sure header keys are lower case
    if (section === 'headers') {
      if (typeof criterias === 'string') {
        criterias = criterias.toLowerCase()
      } else if (Array.isArray(criterias)) {
        criterias = criterias.map((val) => val.toLowerCase())
      } else {
        criterias = keysToLowerCase(criterias)
      }
    }

    let match = true

    // passed in values must match what we expect (no less, no more)
    if (modifiers.includes('equals')) {
      match = isEqual(req[section], criterias, criteriaTester)
      // just check that the keys are part of the request
    } else if (modifiers.includes('has')) {
      const keys = Array.isArray(criterias) ? criterias : [criterias]
      match = keys.every((key) => key in req[section])
      // partially match the request
    } else {
      match = isMatch(req[section], criterias, criteriaTester)
    }

    if (!match) {
      return false
    }
  }

  return true
}

/**
 * Transforms the root keys of an object to lowercase
 *
 * @private
 * @param {object} source the source object
 * @returns {object} the object with keys in lowercase
 */
function keysToLowerCase(source) {
  return Object.keys(source).reduce((result, key) => {
    result[key.toLowerCase()] = source[key]
    return result
  }, {})
}

/**
 * Checks a criteria's value against a particular tester
 *
 * @private
 * @param {*} val the value we got from the request
 * @param {*} tester the tester (regexp or function)
 */
function criteriaTester(val, tester) {
  if (tester instanceof RegExp) {
    return tester.test(val)
  } else if (typeof tester === 'function') {
    return tester(val)
  }
}

/**
 * Ensures the response takes atleast <ms> milleseconds
 *
 * @param {*} ms amount of time to delay in milliseconds
 * @param {*} start the timestamp when the request started
 * @returns {Promise}
 */
function delay(ms, start) {
  if (ms) {
    // check if its a range ie: x-y
    range = ms.toString()
    if (range.indexOf('-') != -1) {
      let [min, max] = range.split('-')
      min = parseInt(min)
      ms = Math.random() * (parseInt(max) - min) + min
    }

    // remove the amount of time the request has already
    // take up so we dont over delay for no reason
    const time = ms - (Date.now() - start)
    return new Promise((resolve) => setTimeout(resolve, time))
  }
}

module.exports = {
  SCHEMA_KEYS,
  delay,
  getFileName,
  loadMockFile,
  requestMeetsConditions,
  respond
}
