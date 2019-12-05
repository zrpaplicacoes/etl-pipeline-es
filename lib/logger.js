/**
 * Implements everything log related
 *
 * @module lib/logger
 */

const { format, createLogger, transports } = require("winston")
const { isProd, defaultMeta } = require("./environment")

/**
 * Get the user defined log level.
 *
 * On production defaults to info, otherwise silly.
 *
 * @type {string}
 * @static
 * @constant
 */
const logLevel = process.env.LOG_LEVEL || (isProd ? "info" : "silly")

/**
 * Creates a derived logger using winston.createLogger.
 *
 * By default, in production, logs are limited to info.
 * Locally all logs should appear in your console.
 *
 * @type {DerivedLogger}
 * @static
 * @constant
 */
const logger = new createLogger({
  level: logLevel,
  format: format.json(),
  exitOnError: false,
  defaultMeta,
})

//
// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
//
if (isProd) {
  logger.add(
    new transports.Console({
      format: format.json(),
    }),
  )
} else {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        format.timestamp({
          format: "DD-MM-YYYY HH:mm:ss",
        }),
        format.printf(msg => {
          const { error, timestamp, level, message, timeElapsed } = msg

          let out = `${timestamp} [${level}]: ${message}`

          if (timeElapsed) out += ` (${timeElapsed}ms)`
          if (error && error.stack) out += `\n\n${error.stack}\n`
          if (error && error.code) out += ` (${error.code})`

          return out
        }),
      ),
    }),
  )
}

module.exports = {
  logger,
}
