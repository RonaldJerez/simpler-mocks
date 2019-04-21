#!/usr/bin/env node
const path = require('path')
const server = require('./server')
const { ArgumentParser } = require('argparse')
const pkg = require('../package.json')

const cli = new ArgumentParser({
  addHelp: true,
  prog: 'simpler-mocks',
  version: pkg.version,
  description: pkg.description
})

cli.addArgument(['--port', '-p'],
  {
    type: 'int',
    defaultValue: 0,
    help: 'The port to run the server on. Defaults to a random open port if none is set.'
  }
)

cli.addArgument(['--silent', '-s'],
  {
    action: 'storeTrue',
    help: 'Hides http access logs from the terminal.'
  }
)

cli.addArgument([ 'directory' ], {
  nargs:  '?',
  defaultValue: './',
  help:   'The directory where mock api definition files are located. Defaults to the current working directory.'
});

const args = cli.parseArgs()

const mocksDirectory = path.resolve(process.cwd(), args.directory)
server(mocksDirectory, args.port, args.silent)