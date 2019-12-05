/**
 * Implement stream functionally
 * related to stream.Transform
 *
 * @module core/transform
 */

// Dependencies
const stream = require("stream")
const parallel = require("parallel-stream")

// Lib
const { logger } = require("../lib")

// Source
const { concurrency } = require("./constants")

/**
 * Creates a transformation stream
 * that receives a buffer from the server
 * and generates objects representing
 * air travel routes.
 *
 * The specification of the incoming data
 * is given by:
 *
 * Airline: 2-letter (IATA) or 3-letter (ICAO) code of the airline.
 * Airline ID: Unique OpenFlights identifier for airline (see Airline).
 * Source airport: 3-letter (IATA) or 4-letter (ICAO) code of the source airport.
 * Source airport ID: Unique OpenFlights identifier for source airport (see Airport)
 * Destination airport: 3-letter (IATA) or 4-letter (ICAO) code of the destination airport.
 * Destination airport ID: Unique OpenFlights identifier for destination airport (see Airport)
 * Codeshare: "Y" if this flight is a codeshare (that is, not operated by Airline, but another carrier), empty otherwise.
 * Stops: Number of stops on this flight ("0" for direct)
 * Equipment: 3-letter codes for plane type(s) generally used on this flight, separated by spaces
 *
 * The data is UTF-8 encoded.
 *
 * The special value \N is used for "NULL" to indicate that no value is available, and is understood automatically by MySQL if imported.
 *
 * Notes:
 *
 * Routes are directional: if an airline operates services from A to B and from B to A, both A-B and B-A are listed separately.
 *
 * Routes where one carrier operates both its own and codeshare flights are listed only once.
 *
 * @returns {stream.Transform}
 */
function toAirtravelRoute() {
  // Act as a queue for semi rows
  const unprocessed = []

  return new stream.Transform({
    objectMode: true,
    transform: (buffer, encoding, done) => {
      let chunk = ""

      // When data is in the queue,
      // we can pop it and reassamble
      // using pop()
      if (unprocessed.length > 0) {
        chunk += unprocessed.pop()
      }

      // Add the previous string
      chunk += buffer.toString(encoding === "buffer" ? "utf8" : encoding)

      const rows = chunk.split(/\r?\n/).map(row => row.split(","))

      // We must remove the last row, since it was cropped
      if (rows[rows.length - 1].length !== rows[0].length) {
        // Remove the last element and rebuild the original string
        unprocessed.push(rows.pop().join(","))
      }

      // Because rows was mutated (pop()), the last vector
      // is no longer in rows and we can proceed
      // with the data transformation
      const routes = rows.map(vector => {
        const [
          airline,
          airlineId,
          sourceAirport,
          sourceAirportId,
          destinationAirport,
          destinationAirportId,
          codeshare,
          stops,
          equipment,
        ] = vector

        return {
          airline,
          airlineId: parseInt(airlineId, 10),
          sourceAirport,
          sourceAirportId: parseInt(sourceAirportId, 10),
          destinationAirport,
          destinationAirportId: parseInt(destinationAirportId, 10),
          codeshare: codeshare === "Y" ? "carrier" : "airline",
          stops: parseInt(stops, 10),
          equipment,
        }
      })

      return done(null, routes)
    },
  })
}

/**
 * Add timestamp to all objects
 * in chunk.
 *
 * @returns {stream.Transform}
 */
function addTimestamp() {
  // Lock timestamp for every element of the stream
  const timestamp = new Date(Date.now()).toISOString()

  return new stream.Transform({
    objectMode: true,
    transform: (chunk, _, done) => {
      const output = chunk.map(entry => {
        return {
          ...entry,
          timestamp,
        }
      })

      done(null, output)
    },
  })
}

/**
 * Compute calories for a given recipe
 */
function calories() {
  return new parallel.transform(
    (chunk, _, done) => {
      const calories = (chunk.nutrition || []).reduce((p, n) => p + n, 0)

      logger.silly(`Computed ${calories}kcal for ${chunk.name} recipe`)

      done(null, { ...chunk, calories })
    },
    { objectMode: true, concurrency },
  )
}

/**
 * Stringify any given chunk, when chunk is
 * an object, using JSON.stringify with 'utf8'
 * encoding.
 *
 * A buffer is generated from the encoded string
 * and the internal.Transform callback is called.
 *
 * @returns {stream.Transform}
 */
function stringify() {
  return new stream.Transform({
    objectMode: true,
    transform: (chunk, _, done) => {
      // this also covers arrays
      if (typeof chunk === "object") {
        done(null, Buffer.from(JSON.stringify(chunk)))
      } else {
        done(null, chunk)
      }
    },
  })
}

// Exports
module.exports = {
  toAirtravelRoute,
  addTimestamp,
  calories,
  stringify,
}
