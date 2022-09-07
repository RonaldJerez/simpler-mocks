#!/usr/bin/env node
const path = require('path')
const app = require('./index')
const { ArgumentParser } = require('argparse')
const pkg = require('../package.json')

const cli = new ArgumentParser({
  add_help: true,
  prog: 'simpler-mocks',
  description: pkg.description
})

cli.add_argument('--port', '-p', {
  type: 'int',
  default: process.env.MOCKS_PORT || 0,
  help: 'The port to run the server on. Defaults to a random open port if none is set.'
})

cli.add_argument('--silent', '-s', {
  action: 'store_true',
  help: 'Hides http access logs from the terminal.'
})

cli.add_argument('--verbose', '-vv', {
  action: 'store_true',
  help: 'Shows more informational console logs.'
})

cli.add_argument('--watch', '-w', {
  action: 'store_true',
  help: 'Watch the base directory for changes'
})

cli.add_argument('--nodelays', '-n', {
  action: 'store_true',
  help: 'Ignores all delay settings in the mocks'
})

cli.add_argument('directory', {
  nargs: '?',
  default: './',
  help: 'The directory where mock api definition files are located. Glob syntax supported. Defaults to the current working directory.'
})

cli.add_argument('-v', '--version', {
  action: 'version',
  version: `Version: ${pkg.version}`
})

const args = cli.parse_args()
const mocksDirectory = path.resolve(process.cwd(), args.directory)

// start the app
app(mocksDirectory, args).then((server) => {
  const exit = (signal) => {
    console.log(`Received signal: ${signal}, exiting`)
    server.close()
    process.exit()
  }

  process.on('SIGINT', exit)
  process.on('SIGTERM', exit)
})
