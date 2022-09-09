const cache = require('./cache')
const chance = require('chance').Chance()

class CustomType {
  constructor(data) {
    this.data = data
  }

  toJSON() {
    return this.data
  }

  /**
   * @interface
   * Test a particular value to see if it meets this data type's conditions
   * @param {*} value - The value to test
   **/
  test(value) {
    /* istanbul ignore next */
    return false
  }
}

/**
 * @class
 * the Any class to be used to identify the custom !any tag
 *
 * @property {string} type
 */
class Any extends CustomType {
  /**
   * constructors new Any
   * @param {string} type the type of data this tag will match, could be boolean|string|number|array
   */
  constructor(type) {
    super()
    if (type) {
      this.type = type.toLowerCase()
    }
  }

  test(value) {
    let result

    // when no type is specify, we dont care for the actual value
    if (!this.type) {
      result = true
    } else if (this.type === 'array') {
      result = Array.isArray(value)
    } else {
      result = typeof value === this.type
    }

    // found a result, store as the value of this instance
    result && (this.data = value)
    return result
  }
}

/**
 * @class
 * Custom regexp Class that outputs the content of data to when dumping JSON
 *
 * @property {RegExp} pattern
 * @property {*} data the value of this object to be outputed using toJSON
 */
class CustomRegExp extends CustomType {
  /**
   * constructs new CustomRegExp
   * @param {*} pattern the regexp pattern for this object
   */
  constructor(pattern) {
    super()
    this.pattern = pattern
  }

  test(value) {
    const matches = this.pattern.exec(value)
    const result = !!matches

    // if we found a match, save as the value of this instance
    if (result) {
      if (matches.length > 1) {
        // If there were groups in the regexp, store it.
        // if only one group, save that as single value, otherwise save just the group results
        this.data = matches.length === 2 ? matches[1] : matches.slice(1)
      } else {
        // when there's no grouping, just save wheter the regexp was successful
        this.data = result
      }
    }

    return result
  }
}

class Save extends CustomType {
  constructor(keys, tester, staticVal, optional = false) {
    tester = tester || new Any()

    super(tester)
    this.keys = keys
    this.staticVal = staticVal
    this.optional = optional
  }

  test(requestInput) {
    const result = tester(requestInput, this.data)

    if (result) {
      // found a match, save it to the temp storage
      // the server code is responsible for storing it to a permenent location
      let dataToStore = this.staticVal
      if (!dataToStore) {
        const isCustomType = this.data instanceof CustomType
        dataToStore = isCustomType ? this.data : result
      }

      if (Array.isArray(this.keys)) {
        this.keys.forEach((key, index) => {
          cache._storage[key] = new StoredIndexItem(index, dataToStore)
        })
      } else {
        cache._storage[this.keys] = dataToStore
      }
    }

    return this.optional || result
  }
}

/**
 * Custom data type used in conjuction with save, in order to
 * point data to a specifc index.
 */
class StoredIndexItem extends CustomType {
  /**
   *
   * @param {*} index - the index in the array where the value we want is stored.
   * @param {*} data - the customtype item we want to store
   */
  constructor(index, data) {
    /* istanbul ignore next */
    if (!data || isNaN(index)) {
      throw new Error('Stored index items need an index and a value')
    }
    super(data)
    this.index = index
  }

  toJSON() {
    const isCustomType = this.data instanceof CustomType
    const data = isCustomType ? this.data.toJSON() : this.data

    if (Array.isArray(data)) {
      return data[this.index]
    }

    console.warn(`Could not access index '${this.index} of non array.`)
    return data
  }
}

class Get extends CustomType {
  constructor(key, defaultVal, once = false) {
    super()
    this.key = key
    this.default = defaultVal
    this.once = once
  }

  _retrieveFromCache(json) {
    // gets an item from storage
    // temp storage (current session) first, then the persisted storage
    this.item = this.item || cache._storage[this.key] || cache.storage[this.key]
    let value = this._getValue(this.item || this.default, json)

    if (this.once) {
      delete cache._storage[this.key]
      delete cache.storage[this.key]
    }

    return value || null
  }

  _getValue(item, json) {
    if (!item) return

    let value = item

    if (json && typeof item.toJSON === 'function') {
      value = item.toJSON()
    } else if (item instanceof CustomType) {
      value = item.data
    }

    return value
  }

  toJSON() {
    return this._retrieveFromCache(true)
  }

  valueOf() {
    // TODO: valueOf of should not remove from cache
    return this._retrieveFromCache()
  }

  test(value) {
    // purposely left as loose equality "==" so we can match
    // query "strings" against their possibly non string counter parts
    return value == this.toJSON()
  }
}

class Random {
  constructor(funcName, params) {
    this.funcName = funcName
    this.params = params && !Array.isArray(params) ? [params] : params
    this.generateValue()
  }

  generateValue() {
    if (!chance[this.funcName]) {
      console.warn(`Chance does not contain a '${this.funcName}' function`)
      return
    }
    this.generatedValue = chance[this.funcName].apply(chance, this.params)
  }

  toJSON() {
    return this.generatedValue
  }
}

/**
 * Checks a value against a particular type
 * NOTE: The signature must remain as this is used for lodash's isEqual and isMatch methods
 *
 * @param {*} inputVal the value we got from the request
 * @param {*} referenceVal the tester (regexp or function)
 */
function tester(inputVal, referenceVal) {
  if (referenceVal instanceof CustomType) {
    return referenceVal.test(inputVal)
  } else if (referenceVal instanceof RegExp) {
    return referenceVal.test(inputVal)
  } else if (typeof referenceVal === 'function') {
    return referenceVal(inputVal)
  } else if (typeof referenceVal === 'string') {
    return inputVal === referenceVal
  }
}

module.exports = {
  Any,
  CustomRegExp,
  CustomType,
  Get,
  Save,
  Random,
  tester
}
