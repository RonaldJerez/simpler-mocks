const Koa = require('koa')
const Router = require('koa-router')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const cache = require('./cache')
const { SCHEMA_KEYS, ...lib } = require('./lib')

const koa = new Koa()
const router = new Router()
let skipDelays = false

// adds a route so that the cache store can be cleared
router.get('/simpler-mocks/reset-store', (ctx) => {
  ctx.type = 'html'
  ctx.body = 'Store cleared. ✅<br /><br />'

  if (Object.keys(cache.storage).length) {
    ctx.body += "<p style='text-decoration: underline'>Previously stored values</p>"
    for (key in cache.storage) {
      ctx.body += `<b>${key}:</b> ${cache.storage[key]}<br />`
    }
    cache.storage = {}
  }

  return
})

// catch all requests
router.all('(.*)', async (ctx, next) => {
  const start = Date.now()

  // cache the current request before loading the yml file
  // so we have access to the data in the !request tag
  cache.request = ctx.request

  const mocks = (await lib.loadMockFile(ctx.method, ctx.path)) || []
  const mock = mocks.find((mock) => {
    // give each mock its own clean temp storage
    cache._storage = {}
    return lib.requestMeetsConditions(ctx.request, mock)
  })

  if (mock) {
    // we found a matching mock file, if there is anything
    // to persit move it to the permenent location
    if (Object.keys(cache._storage).length) {
      Object.assign(cache.storage, cache._storage)
    }

    if (!skipDelays) {
      await lib.delay(mock[SCHEMA_KEYS.delay], start)
    }

    lib.respond(ctx, mock)
  }

  // must call to get logger
  next()
})

koa.use(bodyParser())
koa.use(router.routes())
koa.use(router.allowedMethods())

// defaulting the port to 0 allows the OS to select a random free port
function server({ port = 0, silent = false, nodelays = false }) {
  skipDelays = nodelays

  /* istanbul ignore next */
  if (!silent) {
    koa.use(logger())
  }

  const instance = koa.listen(port, function () {
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
