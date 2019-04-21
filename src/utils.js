const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const isMatch = require('lodash.ismatchwith')
const isEqual = require('lodash.isequalwith')

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
function loadMocksConfig(filename) {
  let docs
  const file = fs.readFileSync(filename, 'utf8')

  try {
    docs = yaml.safeLoad(file)
    docs = Array.isArray(docs) ? docs : [docs]
  } catch (err) {
    /* istanbul ignore next */
    console.error(err.message)
  }

  return docs
}

function processMock(ctx, mock) {
  if (mock.status) ctx.status = mock.status
  if (mock.headers) ctx.set(mock.headers)
  if (mock.response) ctx.body = mock.response
}

function requestMatchesMock(req, matchers) {
  // if there is nothing to verify its automatically a match
  if (matchers === undefined) return true
  if (matchers === false) return false

  // if any fail, its not a match
  for (config in matchers) {
    let [section, ...modifiers] = config.split('.')

    let match = true

    // passed in values must match what we expect (no less, no more)
    if (modifiers.includes('equal')) {
      match = isEqual(req[section], matchers[config])
      // just check that the keys are part of the request
    } else if (modifiers.includes('has')) {
      const keys = Array.isArray(matchers[config]) ? matchers[config] : [matchers[config]]
      match = keys.every((key) => key in req[section])
      // partially match the request
    } else {
      match = isMatch(req[section], matchers[config])
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
  delay,
  getFileName,
  loadMocksConfig,
  requestMatchesMock,
  processMock
}
