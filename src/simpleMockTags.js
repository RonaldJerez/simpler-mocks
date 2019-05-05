const fs = require('fs')
const yaml = require('js-yaml')
const _get = require('lodash.get')
const Chance = require('chance')
const cache = require('./cache')
const util = require('./util')

let MOCK_TAGS
const chance = new Chance()

// Example Custom Type
// https://github.com/nodeca/js-yaml/blob/master/examples/custom_types.js
// kind: scalar = string, sequence = array, mapping = object

// includes a fixture
const IncludeType = new yaml.Type('!include', {
  kind: 'scalar',
  resolve: function(data) {
    return data !== null
  },
  construct: function(name) {
    let fileContent, output
    const fixture = cache.fixtures[name]

    if (fixture) {
      // new fixture, load the content to the cache
      if (fixture.new) {
        try {
          fileContent = fs.readFileSync(fixture.file, 'utf8')
          cache.fixtures[name].new = false
          cache.fixtures[name].content = fileContent
        } catch (error) {
          /* istanbul ignore next */
          console.error(error.message)
        }
      } else {
        fileContent = fixture.content
      }

      // parse the yaml code
      try {
        output = yaml.safeLoad(fileContent, { schema: MOCK_TAGS })
      } catch (error) {
        /* istanbul ignore next */
        console.error(error.message)
      }
    }

    return output
  }
})

// gets data from the request object
const RequestType = new yaml.Type('!request', {
  kind: 'scalar',
  resolve: function(data) {
    return data !== null
  },
  construct: function(data) {
    return _get(cache.request, data, {})
  }
})

// generates random data using chance js
const ChanceType = new yaml.Type('!random', {
  kind: 'scalar',
  resolve: function(data) {
    return data !== null
  },
  construct: function(data) {
    let type, options
    const indexOfSpace = data.indexOf(' ')

    if (indexOfSpace == -1) {
      type = data
    } else {
      type = data.substring(0, indexOfSpace)
      options = util.parseOptions(data.substring(indexOfSpace))
    }

    return chance[type] ? chance[type](options) : undefined
  }
})

const AnyType = new yaml.Type('!any', {
  kind: 'scalar',
  construct: function(data) {
    return new util.Any(data)
  },
  instanceOf: util.Any
})

MOCK_TAGS = yaml.Schema.create([AnyType, ChanceType, IncludeType, RequestType])
module.exports = MOCK_TAGS
