/**
 * Every constant and env var
 * required for running the application
 *
 * @module core/constants
 */

/**
 * Openflight database routes data url
 */
const routesUrl =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat"

// Concurrency for parallel transform and writable
const c = parseInt(process.env.CONCURRENCY || "1", 10)
const concurrency = isNaN(c) ? 1 : c

// Exports
module.exports = {
  routesUrl,
  concurrency,
}
