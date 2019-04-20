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

app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())

// defaulting the port to 0 allows the OS to select a random free port
function server (mocks, port = process.env.PORT || 0, silent = false) {
  mocksDirectory = mocks

  // this is mainly to silence the logger during testing
  if (!silent) {
    app.use(logger())
  }

  const _server = app.listen(port)

  console.log(`Mock server running on:\thttp://localhost:${_server.address().port}`)
  return _server
}

// if this is the main app, run the server
/* istanbul ignore next */
if (require.main === module)
  server('./samples')

module.exports = server
