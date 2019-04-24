const path = require('path')
const Koa = require('koa')
const Router = require('koa-router')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const { SCHEMA_KEYS, ...lib } = require('./lib')

const koa = new Koa()
const router = new Router()

let mocksDirectory

// catch all requests
router.all('*', async (ctx, next) => {
  const start = Date.now()
  const fileName = await lib.getFileName(mocksDirectory, ctx.path, ctx.method)
  const mocks = (await lib.loadMockFile(fileName)) || []

  let delay = 0

  // Array.some continues when false, breaks when true.
  mocks.some((mock) => {
    if (!lib.requestMeetsConditions(ctx.request, mock)) {
      return false
    }

    // delay must be done outside the loop otherwise it doesnt work
    delay = mock[SCHEMA_KEYS.delay]

    ctx.set('x-mock-file', fileName)
    lib.respond(ctx, mock)
    return true
  })

  await lib.delay(delay, start)

  // must call to get logger
  next()
})

koa.use(bodyParser())
koa.use(router.routes())
koa.use(router.allowedMethods())

// defaulting the port to 0 allows the OS to select a random free port
function server(directory = './', port = 0, silent = false) {
  const cwd = path.dirname(require.main.filename)
  mocksDirectory = path.resolve(cwd, directory)

  if (!silent) {
    koa.use(logger())
  }

  const instance = koa.listen(port, function() {
    console.log(`Simpler-Mocks running at: http://localhost:${this.address().port}`)
    console.log('Serving files from: ', mocksDirectory)
  })

  /* istanbul ignore next */
  instance.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${error.port} is in use, try a different one.`)
    } else {
      throw error
    }
  })

  return instance
}

module.exports = server
