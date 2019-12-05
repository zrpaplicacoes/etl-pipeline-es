// Deps
const axios = require("axios")

// Lib
const { logger } = require("../lib")

/**
 * Generates a download readable stream
 * for the given url.
 *
 * @param {string} url
 *
 * @returns {stream.Readable}
 */
async function download(url) {
  const request = {
    url,
    responseType: "stream",
    responseEncoding: "utf8",
  }

  const response = await axios(request)

  let contentLength = response.data.headers["content-length"]

  if (contentLength) {
    contentLength = parseInt(contentLength, 10) / 1000 ** 2

    logger.silly(`Downloading ~${contentLength.toFixed(1)}MB from ${url}`)
  }

  return response.data
}

// Exports
module.exports = {
  download,
}
