// Dependencies
const AWS = require("aws-sdk")
const parallel = require("parallel-stream")

// Lib
const { logger } = require("../lib")
const { concurrency } = require("./constants")

// Globals
const esDomain = process.env.ES_DOMAIN

if (!esDomain) {
  throw `
    An ElasticSearch domain is required to run this application.
    Modify your .env file to include an envvar ES_DOMAIN;
  `
}

// Log failed / success ES requests
const logFailedResponses = process.env.LOG_FAILED_ES_RESPONSES === "true"
const logSuccessResponses = process.env.LOG_SUCCESS_ES_RESPONSES === "true"

/**
 * Generate a single request body
 */
function generateRequestBody(indexPrefix, type, data) {
  const { timestamp } = data
  const t = new Date(timestamp ? timestamp : Date.now())

  // Format indexes name as
  // prefix-YYYY.MM.DD
  const indexName = [
    indexPrefix + t.getUTCFullYear(), // year
    ("0" + (t.getUTCMonth() + 1)).slice(-2), // month
    ("0" + t.getUTCDate()).slice(-2), // day
  ].join(".")

  // Define source of data
  const source = {
    ...data,
  }

  // Create action
  const action = {
    index: {
      _index: indexName,
      _type: type,
    },
  }

  return [JSON.stringify(action), JSON.stringify(source)].join("\n") + "\n"
}

/**
 * Generates the bulk request body
 * using the routes array
 *
 * @param {string} indexPrefix - The index which this document belongs
 * @param {type} type - The document type
 * @param {any[]} routes
 */
function generateBulkRequestBody(indexPrefix, type, data) {
  let bulkRequestBody = ""

  if (Array.isArray(data)) {
    data.forEach(
      d => (bulkRequestBody += generateRequestBody(indexPrefix, type, d)),
    )
  } else {
    bulkRequestBody += generateRequestBody(indexPrefix, type, data)
  }

  return bulkRequestBody
}

/**
 * Post data to ES /_bulk
 *
 * @param {*} body
 * @param {*} callback
 */
function post(body, callback) {
  const endpoint = new AWS.Endpoint(esDomain)
  const request = new AWS.HttpRequest(endpoint, "us-east-1")

  request.method = "POST"
  request.path = "/_bulk"
  request.body = body

  request.headers["Host"] = esDomain
  request.headers["Content-Type"] = "application/json"
  request.headers["Content-Length"] = Buffer.byteLength(request.body)

  const credentials = new AWS.EnvironmentCredentials("AWS")
  const signer = new AWS.Signers.V4(request, "es")

  signer.addAuthorization(credentials, new Date())

  const client = new AWS.HttpClient()

  client.handleRequest(
    request,
    null,
    function(response) {
      var responseBody = ""

      response.on("data", function(chunk) {
        responseBody += chunk
      })

      response.on("end", function() {
        var info = JSON.parse(responseBody)
        var failedItems
        var success
        var error

        if (response.statusCode >= 200 && response.statusCode < 299) {
          failedItems = info.items.filter(function(x) {
            return x.index.status >= 300
          })

          success = {
            attemptedItems: info.items.length,
            successfulItems: info.items.length - failedItems.length,
            failedItems: failedItems.length,
          }
        }

        if (response.statusCode !== 200 || info.errors === true) {
          // prevents logging of failed entries, but allows logging
          // of other errors such as access restrictions
          delete info.items
          error = {
            statusCode: response.statusCode,
            responseBody: info,
          }
        }

        callback(error, success, response.statusCode, failedItems)
      })
    },
    function(error) {
      logger.error("Client could not handle request to ES", { error })
      callback(error)
    },
  )
}

/**
 * Log failed items
 *
 * @param {*} error
 * @param {*} failedItems
 */
function logFailure(error, failedItems) {
  if (logFailedResponses) {
    logger.error("Error: " + JSON.stringify(error, null, 2))

    if (failedItems && failedItems.length > 0) {
      logger.error("Failed Items: " + JSON.stringify(failedItems, null, 2))
    }
  }
}

/**
 * A transform stream that returns
 * null on internal.Transform, resulting
 * on stream finish
 */
function toElasticSearch({ indexPrefix, type }) {
  const queue = []

  const writable = new parallel.writable(
    (chunk, _encoding, done) => {
      let body

      if (Array.isArray(chunk)) {
        body = generateBulkRequestBody(indexPrefix, type, chunk)
      } else {
        queue.push(chunk)

        if (queue.length >= 500) {
          body = generateBulkRequestBody(indexPrefix, type, queue.splice(0))
        }
      }

      if (!body) {
        done(null, null)
        return
      }

      post(body, (error, success, _, failedItems) => {
        if (error) {
          logFailure(error, failedItems)
        } else {
          if (logSuccessResponses) {
            logger.info(
              `Indexed ${success.successfulItems}/${success.attemptedItems} (${success.failedItems} errors)`,
            )
          }
        }

        done(null, null)
      })
    },
    { objectMode: true, concurrency },
  )

  return writable
}

module.exports = {
  toElasticSearch,
}
