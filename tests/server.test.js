const request = require('supertest')
const app = require('../src/index')

let server
beforeAll(async () => {
  server = await app('./', { silent: true })
})

afterAll(() => {
  server.close()
})

describe('General', () => {
  test('empty files', () =>
    request(server)
      .get('/api/empty')
      .expect(404))

  test('non existing endpoint', () =>
    request(server)
      .get('/api/non/existant')
      .expect(404))

  test('requests made to /', () =>
    request(server)
      .get('/')
      .expect(200))

  test('endpoint with deeper path', () =>
    request(server)
      .get('/api/deep/endpoint')
      .expect(201))

  test('reads documents with a single mock', () =>
    request(server)
      .get('/api/single')
      .expect(200, { color: 'blue' }))

  test('reads documents with multiple mocks', () =>
    request(server)
      .get('/api/multi')
      .expect(400, { mock: 'fallback' })
      .expect('x-custom', 'custom header value'))

  test('pick the first mock that matches', () =>
    request(server)
      .get('/api/multi?which=first')
      .expect({ mock: 'first' }))

  test('wildcard path sections', () => {
    request(server)
      .delete('/api/user/1233333/profle')
      .expect(204)
  })

  test('wildcard path sections', () => {
    request(server)
      .delete('/api/user/555555/profle')
      .expect(204)
  })

  test('mocks with delay', async () => {
    const start = Date.now()
    await request(server).get('/api/delay')
    const end = Date.now()

    expect(end - start).toBeGreaterThanOrEqual(150)
  })

  test('mocks with range delay', async () => {
    const start = Date.now()
    await request(server).get('/api/delay?range')
    const end = Date.now()

    expect(end - start).toBeGreaterThanOrEqual(250)
  })
})

describe('Response Content-Type', () => {
  test('regular json, application/json', () =>
    request(server)
      .get('/api/content?type=json')
      .expect('Content-Type', /application\/json/))

  test('yml to json -> application/json', () =>
    request(server)
      .get('/api/content?type=json2')
      .expect('Content-Type', /application\/json/))

  test('text/html', () =>
    request(server)
      .get('/api/content?type=html')
      .expect('Content-Type', /text\/html/))

  test('text/plain', () =>
    request(server)
      .get('/api/content?type=text')
      .expect('Content-Type', /text\/plain/))
})

describe('Matcher modifiers', () => {
  test('.has: string value', () =>
    request(server)
      .get('/api/modifier')
      .set('x-has-single', 'anything')
      .expect(201))

  test('.has: array value', () =>
    request(server)
      .get('/api/modifier')
      .set('x-has-one', 'anything')
      .set('x-has-two', 'anything')
      .expect(202))

  test('.only', () =>
    request(server)
      .post('/api/modifier')
      .send({ one: 1 })
      .expect(204))

  test('.only, extra content', () =>
    request(server)
      .post('/api/modifier')
      .send({ one: 1, two: 2 })
      .expect(404))

  test('.not', () =>
    request(server)
      .post('/api/modifier')
      .send({ one: 1, three: 3 })
      .expect(203))

  test('.only.has', () =>
    request(server)
      .get('/api/modifier?item1=true&item2=true')
      .expect(203))

  test('.only.has, extra content', () =>
    request(server)
      .get('/api/modifier?item1=true&item2=true&item3=true')
      .expect(404))
})

describe('Non SCHEMA files', () => {
  test('YAML files', () =>
    request(server)
      .get('/api/simple/yaml')
      .expect(200)
      .expect('Content-Type', /application\/json/))

  test('Plain text', () =>
    request(server)
      .get('/api/simple/text')
      .expect(200)
      .expect('Content-Type', /text\/plain/))

  test('JSON files', () =>
    request(server)
      .get('/api/simple/json')
      .expect(200)
      .expect('Content-Type', /application\/json/))
})

describe('Testers', () => {
  test('RegExp Passed', () =>
    request(server)
      .get('/api/testers?code=12-345')
      .expect(201))

  test('RegExp Failed', () =>
    request(server)
      .get('/api/testers?code=12345')
      .expect(400))

  test('Function Passed', () =>
    request(server)
      .get('/api/testers?code=5')
      .expect(202))

  test('Function Failed', () =>
    request(server)
      .get('/api/testers?code=20')
      .expect(400))
})

describe('Case Insenstive Headers', () => {
  test('With Objects', () =>
    request(server)
      .get('/api/headers')
      .set('x-name', 'one')
      .set('x-PROP', 'two')
      .expect(201))

  test('With Strings', () =>
    request(server)
      .get('/api/headers')
      .set('x-PROP', 'anything')
      .expect(202))

  test('With Sets', () =>
    request(server)
      .get('/api/headers')
      .set('x-ONE', 'anything')
      .set('x-tWo', 'anything')
      .expect(203))
})

describe('Custom Tags', () => {
  test('!request query', () =>
    request(server)
      .get('/api/tags?input=hello')
      .expect(200, { output: 'hello' }))

  test('!request headers', () =>
    request(server)
      .get('/api/tags')
      .set('x-test', 123)
      .expect(200, { output: '123' }))

  test('!random', () =>
    request(server)
      .get('/api/tags?type=random')
      .expect(200)
      .expect((res) => {
        if (!('name' in res.body)) throw new Error('missing name key')
        if (!('city' in res.body)) throw new Error('missing test key')
        if (!('number' in res.body || res.body.number == 2))
          throw new Error('number missing, or bad data')
      }))

  test('!include, fixture exists', () =>
    request(server)
      .get('/api/tags?type=good-include')
      .expect(200))

  test('!include, fixture does not exists', () =>
    request(server)
      .get('/api/tags?type=bad-include')
      .expect(404))

  test('!any, correct data', () =>
    request(server)
      .post('/api/any')
      .send({
        address: {
          name: 123,
          city: 'anytown',
          zip: 55555,
          active: false
        },
        opts: [1, 2, 3]
      })
      .expect(204))

  test('!any, incorrect data', () =>
    request(server)
      .post('/api/any')
      .send({
        address: {
          name: 123,
          city: 'anytown',
          zip: '55555',
          active: 'false'
        },
        opts: [1, 2, 3]
      })
      .expect(400))

  test('!regexp, single group', () =>
    request(server)
      .get('/api/tags?type=regexp&email=rocket@guardians.com')
      .expect(200, { nickname: 'rocket' }))

  test('!regexp, multi group', () =>
    request(server)
      .get('/api/tags?type=regexp3&email=rocket@guardians.com')
      .expect(200, { data: ['rocket', 'guardians'] }))

  test('!regexp, status', () =>
    request(server)
      .get('/api/tags?type=regexp2&pin=000202')
      .expect(202))
})
