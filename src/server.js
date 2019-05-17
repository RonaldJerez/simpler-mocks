const Koa = require('koa')
const Router = require('koa-router')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const cache = require('./cache')
const { SCHEMA_KEYS, ...lib } = require('./lib')

const koa = new Koa()
const router = new Router()

// catch all requests
router.all('*', async (ctx, next) => {
  const start = Date.now()

  // cache the current request before loading the yml file
  // so we have access to the data in the !request tag
  cache.request = ctx.request

  const mocks = (await lib.loadMockFile(ctx.method, ctx.path)) || []
  const mock = mocks.find((mock) => lib.requestMeetsConditions(ctx.request, mock))

  if (mock) {
    const delay = mock[SCHEMA_KEYS.delay] || 0
    await lib.delay(delay, start)
    lib.respond(ctx, mock)
  }

  // must call to get logger
  next()
})

koa.use(bodyParser())
koa.use(router.routes())
koa.use(router.allowedMethods())

// defaulting the port to 0 allows the OS to select a random free port
function server(port = 0, silent = false) {
  if (!silent) {
    koa.use(logger())
  }

  const instance = koa.listen(port, function() {
    console.log(`\nSimpler-Mocks running at: http://localhost:${this.address().port}`)
    console.log(`Serving files from: ${cache.mocksDirectory}\n`)
  })

  /* istanbul ignore next */
  instance.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${error.port} is in use, try a different one.`)
      process.exit(1)
    } else {
      throw error
    }
  })

  return instance
}

module.exports = server
