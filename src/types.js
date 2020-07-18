const cache = require('./cache')

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

    // if we found a match, save as the value of this instance
    if (matches && matches.length > 1) {
      this.data = matches.length === 2 ? matches[1] : matches.slice(1)
    }

    return !!matches
  }
}

class Save extends CustomType {
  constructor(key, value) {
    value = value || new Any()

    super(value)
    this.key = key
  }

  test(value) {
    const result = tester(value, this.data)

    if (result) {
      // found a match, save it to the temp storage
      // the server code is responsible for storing it to a permenent location
      const isCustom = this.data instanceof CustomType
      cache._storage[this.key] = isCustom ? this.data : result
    }

    return result
  }
}

class Get extends CustomType {
  constructor(key, defaultVal) {
    super()
    this.key = key
    this.default = defaultVal
  }

  toJSON() {
    // gets an item from storage
    // temp storage (current session) first, then the persisted storage
    let item = cache._storage[this.key] || cache.storage[this.key] || this.default || null

    if (item && item instanceof CustomType) {
      item = item.toJSON()
    }
    return item
  }

  test(value) {
    // purposely left as loose equality "==" so we can match
    // query "strings" against their possibly non string counter parts
    return value == this.toJSON()
  }
}

/**
 * Checks a value against a particular type
 * NOTE: The signature must remain as this is used for lodash's isEqual and isMatch methods
 *
 * @param {*} val the value we got from the request
 * @param {*} tester the tester (regexp or function)
 */
function tester(value, tester) {
  if (tester instanceof CustomType) {
    return tester.test(value)
  } else if (tester instanceof RegExp) {
    return tester.test(value)
  } else if (typeof tester === 'function') {
    return tester(value)
  }
}

module.exports = {
  Any,
  CustomRegExp,
  CustomType,
  Get,
  Save,
  tester
}
