//app.js
const Koa = require('koa')
const Router = require('koa-router')
const logger = require('koa-logger')
const utils = require('./utils')

const app = new Koa()
const router = new Router()

let mocksDirectory = './'

// ctx.req.headers
// ctx.req.body
// ctx.req.query

router.all('*', async (ctx, next) => {
  const filename = utils.getFileName(mocksDirectory, ctx.req.url, ctx.req.method)

  if (filename) {
    let delay = 0
    const mocks = utils.loadMocksConfig(filename)

    // Array.some short circuits when returning truthy
    mocks.some((mock) => {
      if (!utils.requestMatchesMock(ctx.req, mock.match)) {
        return false
      }

      // delay must be done outside the loop otherwise it doesnt work
      if (mock.delay) delay = mock.delay

      utils.processMock(ctx, mock)
      return true
    })

    if (delay) {
      await utils.delay(delay)
    }

    return
  }

  // no more routes, return 404
  await next()
})

app.use(logger())
app.use(router.routes())
app.use(router.allowedMethods())

function server (mocks, port) {
  mocksDirectory = mocks
  app.listen(port)
}

server('./samples', 5000)
