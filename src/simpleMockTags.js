const fs = require('fs')
const yaml = require('js-yaml')
const _get = require('lodash.get')
const Chance = require('chance')
const cache = require('./cache')
const util = require('./util')
const types = require('./types')

let MOCK_TAGS
const chance = new Chance()

// Example Custom Type
// https://github.com/nodeca/js-yaml/blob/master/examples/custom_types.js
// kind: scalar = string, sequence = array, mapping = object

// includes a fixture
const Include = new yaml.Type('!include', {
  kind: 'scalar',
  resolve: (data) => data !== null,
  construct: (name) => {
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
const Request = new yaml.Type('!request', {
  kind: 'scalar',
  resolve: (data) => data !== null,
  construct: (data) => _get(cache.request, data, {})
})

// generates random data using chance js
const Random = new yaml.Type('!random', {
  kind: 'scalar',
  resolve: (data) => data !== null,
  construct: (data) => {
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

// match any type of data
const Any = new yaml.Type('!any', {
  kind: 'scalar',
  construct: (data) => new types.Any(data)
})

// save some data for later use
// format: !save key
const Save__string = new yaml.Type('!save', {
  kind: 'scalar',
  resolve: (key) => key && typeof key === 'string',
  construct: (key) => {
    return new types.Save(key)
  }
})

// save some data for later use, if it matches
// format: !save key: matcher
const Save__object = new yaml.Type('!save', {
  kind: 'mapping',
  resolve: (data) => data && Object.keys(data).length === 1, // can only have one key
  construct: (data) => {
    const [key] = Object.keys(data)
    return new types.Save(key, data[key])
  }
})

// save some data for later use with regexp (not implemented)
// format: !save [key1, key2, regexp]
// const Save__array = new yaml.Type('!save', {
//   kind: 'sequence',
//   resolve: (data) => data.length > 2, // can only have one key
//   construct: (data) => {
//     const value = data.pop()
//     return new types.Save(data, value)
//   }
// })

// retrieve persisted data from storage
const Get__string = new yaml.Type('!get', {
  kind: 'scalar',
  resolve: (key) => key && typeof key === 'string',
  construct: (key) => {
    return new types.Get(key)
  }
})

// retrieve persisted data from storage
const Get__object = new yaml.Type('!get', {
  kind: 'mapping',
  resolve: (data) => data && Object.keys(data).length === 1, // can only have one key
  construct: (data) => {
    const [key] = Object.keys(data)
    return new types.Get(key, data[key])
  }
})

// custom !regexp tag, based on the original !!js/regexp tag definition
const jsRegExp = yaml.DEFAULT_FULL_SCHEMA.compiledTypeMap.scalar['tag:yaml.org,2002:js/regexp']

const mockRegExpOptions = {
  ...jsRegExp,
  instanceOf: types.CustomRegExp,
  construct: (data) => {
    const regexp = jsRegExp.construct(data)
    return new types.CustomRegExp(regexp)
  }
}
delete mockRegExpOptions.tag
delete mockRegExpOptions.predicate
const CustomRegExp = new yaml.Type('!regexp', mockRegExpOptions)

MOCK_TAGS = yaml.Schema.create([
  Any,
  Random,
  Get__string,
  Get__object,
  Include,
  CustomRegExp,
  Request,
  Save__string,
  Save__object
])
module.exports = MOCK_TAGS
