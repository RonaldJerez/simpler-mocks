const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const isMatch = require('lodash.ismatchwith')
const isEqual = require('lodash.ismatchwith')

/**
 * Determines if a particular mock exist in our mocks directory
 * 
 * @param {*} mocks 
 * @param {*} url 
 * @param {*} method 
 * 
 * @return {String} the filename that matches this request
 */
function getFileName (mocks, url, method) {
  const filename = path.resolve(mocks, `.${url}`, `${method.toLowerCase()}.yml`)

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
function loadMocksConfig (filename) {
  let docs
  const file = fs.readFileSync(filename, 'utf8')

  try {
    docs = yaml.safeLoad(file)
    docs = Array.isArray(docs) ? docs : [docs]
  } catch (err) {
    consolrr.error(err.message)
  }

  return docs
}

function processMock (ctx, mock) {
  if (mock.status) ctx.status = mock.status
  if (mock.headers) ctx.set(mock.headers)
  if (mock.body) ctx.body = mock.body
}

function requestMatchesMock (req, matches) {
  // if there is nothing to verify its automatically a match
  if (matches === undefined) return true
  if (matches === false) return false

  // return isMatch(req.headers, matches.headers)

  return true
}

/**
 * Resolves a promise in the amount of milliseconds specified
 * 
 * @param {*} ms amount of time to delay in milliseconds
 * @retuns Promise 
 */
function delay (ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  delay,
  getFileName,
  loadMocksConfig,
  requestMatchesMock,
  processMock
}