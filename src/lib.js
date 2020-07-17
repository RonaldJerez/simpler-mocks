const fs = require('fs')
const { promisify } = require('util')
const yaml = require('js-yaml')
const minimatch = require('minimatch')
const isMatch = require('lodash.ismatchwith')
const isEqual = require('lodash.isequalwith')
const cache = require('./cache')
const util = require('./util')
const types = require('./types')
const CUSTOM_TAGS = require('./tags')

const SCHEMA_KEYS = {
  delay: ':delay',
  conditions: ':conditions',
  status: ':status',
  headers: ':headers',
  response: ':response',
  key: ':key',
  cookies: ':cookies'
}

const readFileAsync = promisify(fs.readFile)

/**
 * Determines if a particular mock exist in our mocks directory, based on the request URL and method
 *
 * @param {string} method the request method used
 * @param {string} url the request URL
 * @return {String} the filename that matches this request
 */
async function loadMockFile(method, url) {
  // trim slashs from both ends
  url = url.replace(/^\/+|\/+$/g, '')
  method = method.toLowerCase()

  const name = url ? `${url}.${method}` : `index.${method}`
  const match = cache.mocks.find((mock) => minimatch(name, mock.pattern))
  if (match) {
    util.log('Matched file: ', match.file)
    return await loadYamlFile(match.file)
  }
}

/**
 * loads the mock config from the specified file
 *
 * @private
 * @param {string} fileName the YAML file with the mock's config
 * @returns {Array} an array containing the mock file definition(s)
 */
async function loadYamlFile(fileName) {
  let content
  const file = await readFileAsync(fileName, 'utf8')

  try {
    content = yaml.load(file, { schema: CUSTOM_TAGS })
    if (content && !Array.isArray(content)) {
      content = [content]
    }
  } catch (error) {
    /* istanbul ignore next */
    console.error(error.message)
  }

  if (content) {
    content = content.map((mock, index) => {
      if (mockHasSchema(mock) && !mock[SCHEMA_KEYS.key]) {
        mock[SCHEMA_KEYS.key] = `${fileName}[${index}]`
      }
      return mock
    })
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

  if (mock[SCHEMA_KEYS.status]) {
    const mockStatus = mock[SCHEMA_KEYS.status]
    const statusValue = mockStatus instanceof types.CustomType ? mockStatus.toJSON() : mockStatus
    ctx.status = Number(statusValue)
  }

  // add cookies to the response
  if (mock[SCHEMA_KEYS.cookies]) {
    for (key of Object.keys(mock[SCHEMA_KEYS.cookies])) {
      ctx.cookies.set(key, mock[SCHEMA_KEYS.cookies][key])
    }
  }

  ctx.set('Simpler-Mock-Match', mock[SCHEMA_KEYS.key])
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
  if (typeof conditions === 'boolean') return conditions

  // if any fail, its not a match
  for (const condition in conditions) {
    const [section, ...modifiers] = condition.split('.')
    let criterias = conditions[condition]

    // make sure header keys are lower case
    if (section === 'headers') {
      criterias = headersCriteriasToLower(criterias)
    }

    const match = requestMeetsCriterias(req[section], criterias, modifiers)

    if (!match) {
      return false
    }
  }

  return true
}

/**
 * Checks if the criterias set in the mock, matches that of the request
 *
 * @private
 * @param {*} criterias
 * @param {*} modifiers
 * @param {*} request
 * @returns {boolean}
 */
function requestMeetsCriterias(request, criterias, modifiers) {
  let match = true

  if (modifiers.includes('has')) {
    // just check that the keys are part of the request
    const keys = Array.isArray(criterias) ? criterias : [criterias]
    if (modifiers.includes('only')) {
      match = util.areEqualSets(keys, Object.keys(request))
    } else {
      match = keys.every((key) => key in request)
    }
  } else if (modifiers.includes('only')) {
    // request must match our criteria exactly
    match = isEqual(request, criterias, types.tester)
  } else {
    // partially match the request
    match = isMatch(request, criterias, types.tester)
  }

  return modifiers.includes('not') ? !match : match
}

/**
 * Transforms the header criterias to lower case
 *
 * @param {*} criterias mock's header criterias
 * @returns {*} transformed criterias
 */
function headersCriteriasToLower(criterias) {
  if (typeof criterias === 'string') {
    criterias = criterias.toLowerCase()
  } else if (Array.isArray(criterias)) {
    criterias = criterias.map((val) => val.toLowerCase())
  } else {
    criterias = util.keysToLower(criterias)
  }
  return criterias
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
  loadMockFile,
  requestMeetsConditions,
  respond
}
