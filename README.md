# Simpler Mocks

> REST API mock server made simple. File based, runs on Node with YAML and JSON mock definitions.

[![Build Status](https://travis-ci.org/RonaldJerez/simpler-mocks.svg?branch=master)](https://travis-ci.org/RonaldJerez/simpler-mocks)
[![Coverage Status](https://coveralls.io/repos/github/RonaldJerez/simpler-mocks/badge.svg?branch=master)](https://coveralls.io/github/RonaldJerez/simpler-mocks?branch=master)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

**This project is still a work in progress and is subject to change**

Simpler-Mocks allows you to setup a mock REST API server fairly quickly by setting a YAML config file per endpoint. Simpler-Mocks can even read JSON files, so if you have some existing static JSON files you can use those to get started quickly and convert them to YAML when you want to make use of some of the more advanced features of Simpler-Mocks. Using [JS-YAML](https://github.com/nodeca/js-yaml) to parse the yaml file.

## Example

```yaml
# samples/api/heroes/info.get.yml
- :conditions:
    query:
      name: ironman
  :status: 200
  :response:
    name: Tony Stark
    team: Avengers

- :conditions:
    query:
      name: spiderman
  :status: 200
  :response:
    name: Peter Parker
    team: Freelancer

- # all others
  :status: 400
```

```
$ simpler-mocks --port 8080 ./samples
$ curl http://localhost:8080/api/heroes/info?name=spiderman
```

```json
{ "name": "Peter Parker", "team": "Freelancer" }
```

```
$ curl http://localhost:8080/api/heroes/info?name=ironman
```

```json
{ "name": "Tony Stark", "team": "Avengers" }
```

> Browse the [Samples](samples/) or [Tests](tests/) directory for more.

## Node Usage

```js
const server = require('simpler-mocks')
server('./samples', { port: 8080, watch: true })
```

## CLI Usage

```
    usage: simpler-mocks [-h] [-v] [--port PORT] [--silent] [directory]

    Positional arguments:
    directory             The directory where mock api definition files are
                          located. Glob syntax supported. Defaults to the
                          current working directory.

    Optional arguments:
    -h, --help            Show this help message and exit.
    -v, --version         Show program's version number and exit.
    --port PORT, -p PORT  The port to run the server on. Defaults to a random
                          open port if none is set.
    --silent, -s          Hides http access logs from the terminal.
    --watch, -w           Watch the base directory for changes
    --nodelays, -n        Ignores all delay settings in the mocks
```

## YAML Schema

In order to support sharing of YAML's alias between mock definition Simpler-Mocks does not support YAML's multi document syntax. Rather we allow multiple definitions via sets.

> Your yaml file can be a single object, or a set of objects matching the below schema. All keys are optional.

```yaml
# request conditions that must be met in order to consider this mock, each
# subkey may have modifiers (.has, .only), that affects how its evaluated.
# additonaly, you can set :conditions: to a boolean to either always match or skip it.
# the modifiers may also be negated by adding a .not modifier to the mix.

#   .has      -> must have these key(s) (string or set)
#   .only     -> must only contain these values (object)
#   .only.has -> must have only these key(s) (string or set)
#   .not.has  -> does not have certain keys
:conditions:
  query: {} # query params
  headers: {} # request headers
  body: {} # body payload

# Delays the response by this many milliseconds
# it could be a string to specify a range, ie: '800-2000'
:delay: 1000

# The response status, 200 is default
:status: 200

# Headers to return with the response
:headers: {}

# The response body
:response: {}
```

## Directory Structure

Simpler-mocks is file based which means that in order for it to respond to requests it must be able to find the corresponding files. The directory structure must match the following pattern.

`{base}/{request.path}.{method}.{ext}`

With the exception of requests to `/`, since there's not request path, that file must be named:

`{base}/index.{method}.{ext}`

The extension can be any of `yaml`, `yml` or `json`

### Examples

Server started with:

```
simpler-mocks --port 8080 ./mocks
```

| Request                                   | File                             |
| ----------------------------------------- | -------------------------------- |
| `GET` localhost:8080/                     | ./mocks/index.get.yml            |
| `PUT` localhost:8080/                     | ./mocks/index.put.yml            |
| `POST` localhost:8080/api/user/           | ./mocks/api/user.post.yml        |
| `GET` localhost:8080/api/user/5/          | ./mocks/api/user/5.get.yml       |
| `DELETE` localhost:8080/api/user/6/       | ./mocks/api/user/6.delete.yml    |
| `GET` localhost:8080/api/users/12345/info | ./mocks/api/user/\_/info.get.yml |
| `GET` localhost:8080/api/address/12345    | ./mocks/api/address/\_.get.yml   |

> If there are parts of the path that can be dynamic, you can use an underscore as part of the filename or directory structure as a placeholder. In the last two examples above, notice that the `12345` is a dynamic ID.

## Condition testers

Aside from static values, the request conditions may also be checked against a function or regular express by ways of YAML tags `!!js/function` and `!!js/regexp`. A boolean response or a successful match respectively, determines if the condition is met. Additionally you can also use the custom tag `!any` to check nested object for the existance of a key and not the specific value. The `!any` tag also accepts an optional parameter to check against the value.

### Examples

```yaml
# api/testers.yml
- :conditions:
    query:
      # matches any value in the format: 12-345
      code: !!js/regexp /\d{2}\-\d{3}/
  :status: 200

- :conditions:
    query:
      # matches any value less than 10
      code: !!js/function (val) => val < 10
  :status: 200

- :conditions:
    body:
      address:
        name: !any
        zip: !any number
        active: !any boolean
  :status: 201

- :status: 400
```

The following requests will return 200

```
$ curl http://localhost:8080/api/testers?code=5
$ curl http://localhost:8080/api/testers?code=8
$ curl http://localhost:8080/api/testers?code=33-098
```

While these will return 400

```
$ curl http://localhost:8080/api/testers?code=15
$ curl http://localhost:8080/api/testers?code=aa-abc
$ curl http://localhost:8080/api/testers?code=10
```

## Response Tags

In the response you are able to use special tags to get some dynamic values.

`!request` allows you to include values from the request object in your model, all [Koa Request](https://koajs.com/#request) values are accessible, (query, headers, body ... )

`!include` allows you to include predefined [fixtures](#fixtures) in your models.

`!random` lets you generate randam data using [Chance](https://chancejs.com/)

### Example

```yaml
- :conditions:
    query:
      id: 25
  :status: 200
  :response:
    userid: !request query.id # returns 25
    name: !random name middle:true # random name generated with chance
    address: !include address # imports from __fixtures__/address.yml
```

<a name="fixtures"></a>

## Fixtures

Fixtures are reusable models that you may include in your mocks using the `!include` tag. In order for Simpler-Mocks to find them, you must place them in a directory named `__fixtures__` in your mocks base directory. Place YAML files with the name you wish to access them. For example you can place a YAML file called `address.yml` with the following data into.

```yaml
id: !random guid
name: !random name
line1: 123 Main St
city: Anytown
state: NY
zip: !random zip
```

> Notice that tags can also be used in your fixtures.

You can then include this fixture in any of your mock responses by setting `!include address` where ever you need it.

## Changelog

Please see the [Releases](https://github.com/ronaldjerez/simpler-mocks/releases)
