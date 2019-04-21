const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const isMatch = require('lodash.ismatchwith')
const isEqual = require('lodash.isequalwith')

const SCHEMA_KEYS = {
  delay: ':delay',
  conditions: ':conditions',
  status: ':status',
  headers: ':headers',
  response: ':response'
}

/**
 * Determines if a particular mock exist in our mocks directory
 *
 * @param {*} directory
 * @param {*} url
 * @param {*} method
 *
 * @return {String} the filename that matches this request
 */
function getFileName(directory, url, method) {
  const cwd = path.dirname(require.main.filename)
  const filename = path.resolve(cwd, directory, `.${url}.${method.toLowerCase()}.yml`)

  if (fs.existsSync(filename)) {
    return filename
  }
}

/**
 * loads the mock config from the specified file
 *
 * @param {*} filename the yml file with the mock config
 * @returns {Array}
 */
function loadMockFile(filename) {
  let docs = []
  const file = fs.readFileSync(filename, 'utf8')

  try {
    docs = yaml.load(file)
    docs = Array.isArray(docs) ? docs : [docs]
  } catch (err) {
    /* istanbul ignore next */
    console.error(err.message)
  }

  return docs
}

/**
 * Checks if a given mock has some schema definition
 * 
 * @param {*} mock 
 */
function mockHasSchema(mock) {
  if (Array.isArray(mock) || typeof mock === 'string') {
    return false
  }

  const keys = Object.values(SCHEMA_KEYS)
  return Object.keys(mock).some(key => keys.includes(key))
}

/**
 * Responds to the request
 * 
 * @param {*} ctx 
 * @param {*} mock 
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
 * @param {*} mock the mock definition to check
 * @param {*} req Koa's request object
 */
function requestMeetsConditions(req, mock) {
  // abdance of conditions means the request matches the mock
  if (!mockHasSchema(mock) || mock[SCHEMA_KEYS.conditions] === undefined) {
    return true
  }

  const conditions = mock[SCHEMA_KEYS.conditions]
  if (conditions === 'skip') return false

  // if any fail, its not a match
  for (condition in conditions) {
    const criterias = conditions[condition]
    let [section, ...modifiers] = condition.split('.')

    let match = true
    
    // passed in values must match what we expect (no less, no more)
    if (modifiers.includes('equal')) {
      match = isEqual(req[section], criterias)
      // just check that the keys are part of the request
    } else if (modifiers.includes('has')) {
      const keys = Array.isArray(criterias) ? criterias : [criterias]
      match = keys.every((key) => key in req[section])
      // partially match the request
    } else {
      match = isMatch(req[section], criterias)
    }

    if (!match) {
      return false
    }
  }

  return true
}

/**
 * Resolves a promise in the amount of milliseconds specified
 *
 * @param {*} ms amount of time to delay in milliseconds
 * @retuns Promise
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  SCHEMA_KEYS,
  delay,
  getFileName,
  loadMockFile,
  requestMeetsConditions,
  respond
}
