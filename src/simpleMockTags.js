const fs = require('fs')
const yaml = require('js-yaml')
const _get = require('lodash.get')
const Chance = require('chance')
const cache = require('./cache')

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

// gets data from the request object
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
      options = parseOptions(data.substring(indexOfSpace))
    }

    // -----

    // parses a string of options, returns object
    function parseOptions(str) {
      const arr = str.split(',')

      return arr.reduce((options, option) => {
        const [key, val] = option.split(':')
        if (key && val) {
          options[key.trim()] = parseValue(val.trim())
        }
        return options
      }, {})
    }

    // parses the value from string to real type (boolean or array)
    function parseValue(str) {
      if (str === 'true') return true
      else if (str === 'false') return false
      else if (str.indexOf('|') > 0) return str.split('|')
      else return str
    }

    return chance[type] ? chance[type](options) : undefined
  }
})

MOCK_TAGS = yaml.Schema.create([IncludeType, RequestType, ChanceType])
module.exports = MOCK_TAGS
