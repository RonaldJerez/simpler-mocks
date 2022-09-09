const fs = require('fs')
const yaml = require('js-yaml')
const jsTypes = require('js-yaml-js-types')
const _get = require('lodash.get')
const chance = require('chance').Chance()
const cache = require('./cache')
const util = require('./util')
const types = require('./types')

let CUSTOM_TAGS

const ONCE = 'once'
const OPTIONAL = 'optional'
const WHEN = 'when'

// Example Custom Type
// https://github.com/nodeca/js-yaml/blob/master/examples/custom_types.js
// kind: scalar = string, sequence = array, mapping = object

/**
 * Includes another yaml file into the response
 *
 * @example
 * ```yaml
 * profile:
 *   address: !include address
 *   settings: !include settings
 * ```
 */
const Include__string = new yaml.Type('!include', {
  kind: 'scalar',
  resolve: (data) => data,
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
        output = yaml.load(fileContent, { schema: CUSTOM_TAGS })
      } catch (error) {
        /* istanbul ignore next */
        console.error(error.message)
      }
    }

    return output
  }
})

/**
 * Gets data from Koa's HTTP request. It uses lodash get so you can use
 * dot notation to access deep elements.
 *
 * @example
 * ```yaml
 * origin: !request origin
 * query: !request query.search
 * ```
 */
const Request__string = new yaml.Type('!request', {
  kind: 'scalar',
  resolve: (data) => data,
  construct: (data) => _get(cache.request, data, {})
})

/**
 * generates random data using chance js without any params
 *
 * @example
 * ```yaml
 * fullname : !random name
 * birthday : !random birthday
 * ```
 * @see https://chancejs.com/
 */
const Random__string = new yaml.Type('!random', {
  kind: 'scalar',
  resolve: (name) => name,
  construct: (name) => {
    return new types.Random(name)
  }
})

/**
 * generates random data using chance js, passing it a single param
 *
 * @example
 * ```yaml
 * number: !random natural: {min: 1, max: 20}
 * ```
 * @see https://chancejs.com/
 */
const Random__object = new yaml.Type('!random', {
  kind: 'mapping',
  resolve: (data) => data && Object.keys(data).length === 1,
  construct: (data) => {
    const [name] = Object.keys(data)
    return new types.Random(name, data[name])
  }
})

/**
 * generates random data using chance js, with a multiple params
 *
 * @example !random [pad, 45, 5]
 * @see https://chancejs.com/
 */
const Random__array = new yaml.Type('!random', {
  kind: 'sequence',
  resolve: (data) => data && data.length > 1,
  construct: (data) => {
    const name = data.shift()
    return new types.Random(name, data)
  }
})

/**
 * returns a reference to function in chance js
 * this is useful for chance functions that accept functions as parameters
 *
 * @example !random [ unique, !chance state, 5 ]
 */
const Chance__string = new yaml.Type('!chance', {
  kind: 'scalar',
  resolve: (name) => name,
  construct: (name) => {
    if (!chance[name]) {
      console.warn(`Chance does not contain a ${name} function`)
      return
    }
    return chance[name]
  }
})

/**
 * Matches conditions based on data type
 *
 * format: !any type
 *
 * @example
 * ```yaml
 * name: !any string
 * states: !any array
 * ```
 */
const Any__string = new yaml.Type('!any', {
  kind: 'scalar',
  construct: (data) => new types.Any(data)
})

/**
 * Stores data from a request to be retrieved using !get in the current response or later
 * Saves the data under the given key.
 *
 * format: !save key
 *
 * @example
 * ```yaml
 * name: !save first_name
 * ```
 */
const Save__string = new yaml.Type('!save', {
  kind: 'scalar',
  resolve: (key) => key && typeof key === 'string',
  construct: (key) => {
    return new types.Save(key)
  }
})

/**
 * Stores data from a request to be retrieved using !get in the current response or later
 * Saves the data under the given key only if the matcher returns true
 *
 * format: !save { key: matcher }
 *
 * @example
 * ```yaml
 * name: !save { first_name: !any string }
 * ```
 */
const Save__object = new yaml.Type('!save', {
  kind: 'mapping',
  multi: true,
  resolve: (data) => data && Object.keys(data).length === 1, // can only have one key
  construct: (data, type) => {
    const [tag, ...options] = type.split('.')

    const [key] = Object.keys(data)
    return new types.Save(key, data[key], undefined, options.includes(OPTIONAL))
  }
})

// save some data for later use with regexp (not implemented)
// format: !save [key1, key2, matcher]
/**
 * Stores data from a request to be retrieved using !get in the current response or later
 * Saves data under multiple keys if the value is an array, can also be used in conjunction with !regexp
 * since that also returns an array.
 *
 * format: !save [key1, key2, matcher]
 *
 * @example
 * ```yaml
 * locale: !save [country, language, [US, en]]
 * name: !save
 *  - firstname
 *  - lastname
 *  - !regexp /(\w+)\s(\w+)/
 * ```
 */
const Save__array = new yaml.Type('!save', {
  kind: 'sequence',
  multi: true,
  resolve: (data) => data && data.length > 1, // need a key and a matcher
  construct: (data, type) => {
    const [tag, ...options] = type.split('.')

    const value = data.pop()
    const key = data.length == 1 ? data[0] : data
    return new types.Save(key, value, undefined, options.includes(OPTIONAL))
  }
})

/**
 * Stores static data if the request meets certain creteria
 * Saves the data under the given key only if the matcher returns true
 *
 * format: !set { key: matcher }
 *
 * @example
 * ```yaml
 * name: !set { has_name: yes, when: !any string }
 * ```
 */
const Set__object = new yaml.Type('!set', {
  kind: 'mapping',
  multi: true,
  resolve: (data) => {
    const keys = Object.keys(data)
    return data && keys.length === 2 && keys.includes(WHEN)
  },
  construct: (data, type) => {
    const [tag, ...options] = type.split('.')

    const keys = Object.keys(data)
    const key = keys.filter((val) => val !== WHEN)[0]
    return new types.Save(key, data[WHEN], data[key], options.includes(OPTIONAL))
  }
})

/**
 * Retrieves the value of data that has been persisted using !save
 * If nothing has been saved under that key it returns null
 *
 * format: !get key
 *
 * @example
 * ```yaml
 * name: !get firstname
 * ```
 */
const Get__string = new yaml.Type('!get', {
  kind: 'scalar',
  multi: true,
  resolve: (key) => key && typeof key === 'string',
  construct: (key, type) => {
    const [tag, ...options] = type.split('.')

    return new types.Get(key, undefined, options.includes(ONCE))
  }
})

/**
 * Retrieves the value of data that has been persisted using !save
 * Retrieves the given key or defaults to the given value if nothing has been saved
 *
 * format: !get key: default
 *
 * @example
 * ```yaml
 * name: !get firstname: john
 * ```
 */
const Get__object = new yaml.Type('!get', {
  kind: 'mapping',
  multi: true,
  resolve: (data) => data && Object.keys(data).length === 1, // can only have one key
  construct: (data, type) => {
    const [tag, ...options] = type.split('.')

    const [key] = Object.keys(data)
    return new types.Get(key, data[key], options.includes(ONCE))
  }
})

/**
 * Custom !regexp tag, based on the original !!js/regexp tag definition
 * however if the regexp has groups it allows us to store those groups in
 */
const mockRegExpOptions = {
  ...jsTypes.regexp.options,
  instanceOf: types.CustomRegExp,
  construct: (data) => {
    const regexp = jsTypes.regexp.construct(data)
    return new types.CustomRegExp(regexp)
  }
}
delete mockRegExpOptions.predicate
const RegExp__string = new yaml.Type('!regexp', mockRegExpOptions)

// ----------- //
CUSTOM_TAGS = yaml.DEFAULT_SCHEMA.extend([
  ...jsTypes.all,
  Any__string,
  Chance__string,
  Get__string,
  Get__object,
  Include__string,
  Random__array,
  Random__object,
  Random__string,
  RegExp__string,
  Request__string,
  Save__array,
  Save__string,
  Save__object,
  Set__object
])
module.exports = CUSTOM_TAGS
