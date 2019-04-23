# Simpler Mocks

> REST API mock server made simple. Runs on Node with YAML and JSON mock definitions.

[![Build Status](https://travis-ci.org/RonaldJerez/simpler-mocks.svg?branch=master)](https://travis-ci.org/RonaldJerez/simpler-mocks)
[![Coverage Status](https://coveralls.io/repos/github/RonaldJerez/simpler-mocks/badge.svg?branch=master)](https://coveralls.io/github/RonaldJerez/simpler-mocks?branch=master)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Simpler-Mocks allows you to setup a mock REST API server fairly quickly by setting a YAML config files per endpoint. Simpler-Mocks can even read JSON files, so if you have some existing static JSON files you can use those to get started quickly and convert them to YAML when you want to make use of some of the more advanced features of Simpler-Mocks. Using [JS-YAML](https://github.com/nodeca/js-yaml) to parse the yaml file.

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

## Script Usage

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

> Your yaml file can be a single object, or a set of objects matching the below schema. All keys are optional, but you'll need atleast one, otherwise it will result in 404.

```yaml
# request conditions that must be met in order to consider this mock, each
# subkey may have modifiers (.has, .equals), that affects how its evaluated.
# additonaly, you can set :conditions: to 'skip', to skip this mock all together.
#   .has  -> checks the presence of keys, but not their values
#   .equals -> the object must have the exact payload
:conditions:
  query: {} # query params
  headers: {} # request headers
  body: {} # body payload

# Delays the response by this many milliseconds
:delay: 1000

# The response status, 200 is default
:status: 200

# Headers to return with the response
:headers: {}

# The response body
:response: {}
```

## Changelog

Please see the [Releases](https://github.com/ronaldjerez/simpler-mocks/releases)
