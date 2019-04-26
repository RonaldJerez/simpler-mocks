# Simpler Mocks

> REST API mock server made simple. File based, runs on Node with YAML and JSON mock definitions.

[![Build Status](https://travis-ci.org/RonaldJerez/simpler-mocks.svg?branch=master)](https://travis-ci.org/RonaldJerez/simpler-mocks)
[![Coverage Status](https://coveralls.io/repos/github/RonaldJerez/simpler-mocks/badge.svg?branch=master)](https://coveralls.io/github/RonaldJerez/simpler-mocks?branch=master)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

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
server('./samples', 8080)
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
```

### YAML Schema

In order to support sharing of YAML's alias between mock definition Simpler-Mocks does not support YAML's multi document syntax. Rather we allow multiple definitions via sets.

> Your yaml file can be a single object, or a set of objects matching the below schema. All keys are optional.

```yaml
# request conditions that must be met in order to consider this mock, each
# subkey may have modifiers (.has, .only), that affects how its evaluated.
# additonaly, you can set :conditions: to 'skip', to skip this mock all together.
#   .has      -> must have these key(s) (string or set)
#   .only     -> must only contain these values (object)
#   .only.has -> must have only these key(s) (string or set)
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

| Request                             | File                          |
| ----------------------------------- | ----------------------------- |
| `GET` localhost:8080/               | ./mocks/index.get.yml         |
| `PUT` localhost:8080/               | ./mocks/index.put.yml         |
| `POST` localhost:8080/api/user/     | ./mocks/api/user.post.yml     |
| `GET` localhost:8080/api/user/5/    | ./mocks/api/user/5.get.yml    |
| `DELETE` localhost:8080/api/user/6/ | ./mocks/api/user/6.delete.yml |

## Condition testers

Aside from static values, the request conditions may also be checked against a function or regular express by ways of YAML tags `!!js/function` and `!!js/regexp`. A boolean response or a successful match respectively, determines if the condition is met.

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

## Changelog

Please see the [Releases](https://github.com/ronaldjerez/simpler-mocks/releases)
