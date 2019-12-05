// Imports
const { isProd, isDevelopment, serviceName } = require("./environment")
const { logger } = require("./logger")

// Exports
module.exports = {
  isProd,
  isDevelopment,
  serviceName,
  logger,
}
