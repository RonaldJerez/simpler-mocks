const path = require('path')
const globby = require('globby')
const cache = require('./cache')
const server = require('./server')

async function app(directory = './', port = 0, silent = false, verbose = false) {
  const cwd = path.dirname(require.main.filename)
  cache.mocksDirectory = path.resolve(cwd, directory)
  cache.verbose = verbose

  await findFixtures()
  await findMockFiles()

  return server(port, silent)
}

/**
 * Get a list of all the fixtures and saves it to the cache
 */
async function findFixtures() {
  const glob = path.resolve(cache.mocksDirectory, '__fixtures__', '*.(yml|yaml)')
  const files = await globby(glob)

  const fixtures = files.reduce((result, file) => {
    const [fileName, key] = file.match(/(\w+)\.ya?ml/i)

    cache.verbose && console.log('Found Fixture: ', fileName)
    result[key] = {
      file,
      new: true
    }

    return result
  }, {})

  // TODO: watch the fixture directory for changes
  cache.fixtures = fixtures
}

/**
 * Get a list of all the mocks and url patterns and saves it to the cache
 */
async function findMockFiles() {
  const mocksGlob = ['**/*.(yml|yaml|json)', '!__fixtures__']
  const mocks = await globby(mocksGlob, { cwd: cache.mocksDirectory })

  const config = mocks.map((mock) => {
    const match = mock.match(/(.*)\.(ya?ml|json)/i)

    let [file, url] = match
    const pattern = url.replace(/[^\w]_(?=\/|\.)/g, '/*')

    cache.verbose && console.log('Found Mock: ', file)
    file = path.resolve(cache.mocksDirectory, mock)
    return { file, pattern }
  })

  // TODO: watch the mocks directory for changes
  cache.mocks = config
}

module.exports = app
