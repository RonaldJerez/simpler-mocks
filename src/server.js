//app.js
const Koa = require('koa')
const Router = require('koa-router')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const utils = require('./utils')

const app = new Koa()
const router = new Router()

let mocksDirectory

// catch all requests
router.all('*', async (ctx, next) => {
  const filename = utils.getFileName(mocksDirectory, ctx.path, ctx.method)

  if (filename) {
    let delay = 0
    const mocks = utils.loadMocksConfig(filename)

    mocks.some((mock) => {
      // Array.some short circuits when returning truthy
      // and continues when returning falsy
      if (!utils.requestMatchesMock(ctx.request, mock.match)) {
        return false
      }

      // delay must be done outside the loop otherwise it doesnt work
      if (mock.delay) {
        delay = mock.delay
      }

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
function server(directory = './', port = 0, silent = false) {
  mocksDirectory = directory

  if (!silent) {
    app.use(logger())
  }

  const _server = app.listen(port)

  console.log(`Mock server running on:\t\thttp://localhost:${_server.address().port}`)
  return _server
}

module.exports = server
