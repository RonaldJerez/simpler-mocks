const request = require('supertest')
const Server = require('../src/server')

let server
beforeAll(async () => {
  server = Server('./', 0, true)
})

afterAll(() => {
  server.close()
})

describe('General', () => {
  test('non existing endpoint', () =>
    request(server)
      .get('/api/non/existant')
      .expect(404))

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

  test('mocks with delay setting should be delayed', async () => {
    const start = Date.now()
    await request(server).get('/api/delay')
    const end = Date.now()

    expect(end - start).toBeGreaterThanOrEqual(200)
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

  test('.equal', () =>
    request(server)
      .post('/api/modifier')
      .send({ one: 1 })
      .expect(204))

  test('.equal, extra content', () =>
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
