//app.js
const Koa = require('koa')
const Router = require('koa-router')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser');
const utils = require('./utils')

const app = new Koa()
const router = new Router()

let mocksDirectory = './'

// catch all requests
router.all('*', async (ctx, next) => {
  const filename = utils.getFileName(mocksDirectory, ctx.path, ctx.method)
  
  if (filename) {
    let delay = 0
    const mocks = utils.loadMocksConfig(filename)

    mocks.some((mock) => {
      // Array.some short circuits when returning truthy
      // and continues when returning falsy
      if (!utils.requestMatchesMock(ctx.request, mock.match))
        return false

      // delay must be done outside the loop otherwise it doesnt work
      if (mock.delay) 
        delay = mock.delay

      utils.processMock(ctx, mock)
      return true
    })

    if (delay) {
      await utils.delay(delay)
    }

    return
  }

  // no matching mock, return 404
  await next()
})

app.use(logger())
app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())

function server (mocks, port) {
  mocksDirectory = mocks
  const thePort = port || process.env.PORT || 80
  app.listen(thePort)

  console.log(`Mock server running on:\thttp://localhost:${thePort}`)
}

// if this is the main app, run the server
if (require.main === module)
  server('./samples')

module.exports = server
