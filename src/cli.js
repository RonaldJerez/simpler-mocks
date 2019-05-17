#!/usr/bin/env node
const path = require('path')
const app = require('./index')
const { ArgumentParser } = require('argparse')
const pkg = require('../package.json')

const cli = new ArgumentParser({
  addHelp: true,
  prog: 'simpler-mocks',
  version: pkg.version,
  description: pkg.description
})

cli.addArgument(['--port', '-p'], {
  type: 'int',
  defaultValue: process.env.MOCKS_PORT || 0,
  help: 'The port to run the server on. Defaults to a random open port if none is set.'
})

cli.addArgument(['--silent', '-s'], {
  action: 'storeTrue',
  help: 'Hides http access logs from the terminal.'
})

cli.addArgument(['--verbose', '-vv'], {
  action: 'storeTrue',
  help: 'Shows more informational console logs.'
})

cli.addArgument(['--watch', '-w'], {
  action: 'storeTrue',
  help: 'Watch the base directory for changes'
})

cli.addArgument(['directory'], {
  nargs: '?',
  defaultValue: './',
  help:
    'The directory where mock api definition files are located. Glob syntax supported. Defaults to the current working directory.'
})

const args = cli.parseArgs()

const mocksDirectory = path.resolve(process.cwd(), args.directory)
app(mocksDirectory, args)

// exit gracefully
function exit(signal) {
  console.log(`Received signal: ${signal}, exiting`)
  process.exit(0)
}

process.on('SIGINT', exit)
process.on('SIGTERM', exit)
