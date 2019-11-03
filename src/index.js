const path = require('path')
const globby = require('globby')
const chokidar = require('chokidar')
const cache = require('./cache')
const server = require('./server')
const util = require('./util')

async function app(directory = './', options) {
  const { verbose, watch } = options
  const cwd = path.dirname(require.main.filename)
  cache.mocksDirectory = path.resolve(cwd, directory)
  cache.verbose = verbose

  await findFixtures()
  await findMockFiles()

  if (watch) {
    chokidar
      .watch('**/*.(yml|yaml|json)', { cwd: cache.mocksDirectory, ignoreInitial: true })
      .on('add', onAdd)
      .on('change', addFixture)
      .on('unlink', onRemove)
  }

  return server(options)
}

/**
 * Chokidar add event handler
 * @param {string} file
 */
function onAdd(file) {
  if (file.startsWith('__fixtures__')) {
    addFixture(file)
  } else {
    addMock(file)
    cache.mocks.sort(mocksSorter)
  }
}

/**
 * Chokidar unlink event handler
 * @param {string} file
 */
function onRemove(file) {
  if (file.startsWith('__fixtures__')) {
    removeFixture(file)
  } else {
    removeMock(file)
  }
}

/**
 * Adds fixtures to the cache, or marks an existing fixture as new so it can be reloaded
 * @param {string} file
 */
function addFixture(file) {
  if (!file.startsWith('__fixtures__')) return

  const match = file.match(/([_\.\-\w]+)\.ya?ml$/i)
  const key = match[1]

  const filePath = path.resolve(cache.mocksDirectory, file)
  cache.fixtures[key] = {
    file: filePath,
    new: true
  }

  util.log('Added Fixture: ', key, file)
}

/**
 * Removes a fixture from the cache
 * @param {string} file
 */
function removeFixture(file) {
  util.log('Removed Fixture: ', file)

  const match = file.match(/(\w+)\.ya?ml/i)
  const key = match[1]
  delete cache.fixtures[key]
}

/**
 * Adds a mock to the cache
 * @param {string} file
 */
function addMock(file) {
  util.log('Added Mock: ', file)

  const match = file.match(/(.*)\.(ya?ml|json)/i)
  let pattern = match[1].replace(/\/_(?=\/|\.)/g, '/*')

  // support files with just the method inside a directory
  // ex:  api/some/endpoint.get.yml same as api/some/endpoint/get.yml
  if (pattern.indexOf('.') === -1) {
    const slashPos = pattern.lastIndexOf('/')
    pattern = pattern.slice(0, slashPos) + '.' + pattern.slice(slashPos + 1)
  }

  const filePath = path.resolve(cache.mocksDirectory, file)

  cache.mocks.push({ file: filePath, pattern })
}

/**
 * Removes a mock from cache
 * @param {string} file
 */
function removeMock(file) {
  const index = cache.mocks.findIndex((mock) => mock.file.endsWith(file))

  if (index > -1) {
    util.log('Removed Mock: ', file)
    cache.mocks.splice(index, 1)
  }
}

/**
 * Get a list of all the fixtures and saves it to the cache
 */
async function findFixtures() {
  const glob = '__fixtures__/*.(yml|yaml)'
  const files = await globby(glob, { cwd: cache.mocksDirectory })

  files.forEach(addFixture)
}

/**
 * Get a list of all the mocks and url patterns and saves it to the cache
 */
async function findMockFiles() {
  const mocksGlob = ['**/*.(yml|yaml|json)', '!__fixtures__']
  const mocks = await globby(mocksGlob, { cwd: cache.mocksDirectory })

  mocks.forEach(addMock)
  cache.mocks.sort(mocksSorter)
}

/**
 * Sorts the mocks, putting any with a wildcard towards the bottom
 * @param {*} a
 * @param {*} b
 */
function mocksSorter(a, b) {
  if (a.pattern.indexOf('*') > -1) {
    return 1
  } else {
    return 0
  }
}

module.exports = app
