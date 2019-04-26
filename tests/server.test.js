const request = require('supertest')
const app = require('../src/server')

let server
beforeAll(async () => {
  server = app('./', 0, true)
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

  test('text/html', () =>
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

  test('.equals', () =>
    request(server)
      .post('/api/modifier')
      .send({ one: 1 })
      .expect(204))

  test('.equals, extra content', () =>
    request(server)
      .post('/api/modifier')
      .send({ one: 1, two: 2 })
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
