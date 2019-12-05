/**
 * Do basic environment metadata setup
 *
 * @module lib/environment
 */

// Dependencies
const os = require("os")

/**
 * Returns true when NODE_ENV is set to production
 *
 * @static
 * @constant
 * @type {boolean}
 * */
const isProd = process.env.NODE_ENV === "production"

/**
 * Returns true when NODE_ENV is set to development
 * @static
 * @constant
 * @type {boolean}
 * */
const isDevelopment = process.env.NODE_ENV === "development"

/**
 * Defines the service name
 * Defaults to UNKNOWN
 *
 * @static
 * @constant
 * @type {string}
 */
const serviceName = process.env.SERVICE_NAME || "UNKNOWN"

/**
 * Default metadata for logging services
 *
 * @static
 * @constant
 * @type {Object.<string, any>}
 */
const defaultMeta = {
  service: serviceName,
  host: os.hostname(),
  arch: os.arch(),
  cpus: os.cpus().length,
  platform: os.platform(),
  totalmem: parseInt(os.totalmem() / 1000.0 ** 2) + "MB",
}

// Exports
module.exports = {
  isProd,
  isDevelopment,
  serviceName,
  defaultMeta,
}
