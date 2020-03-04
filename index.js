/**
 * This is the main entrypoint for the demo application.
 *
 * Some examples are under \/** *\/ blocks, feel free
 * to change this code and run other examples
 */

// Try to load env vars from .env file if running locally
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}

// Dependencies
const fs = require("fs")
const zlib = require("zlib")
const csv = require("csv-parser")
const chalk = require("chalk")
const clear = require("clear")
const inquirer = require("inquirer")

// Lib
const { logger } = require("./lib")

// Source
const {
  routesUrl,
  download,
  toAirtravelRoute,
  calories,
  stringify,
  addTimestamp,
  toElasticSearch,
} = require("./src")

logger.debug("Starting Demo Application...")

// Create tmp dir if one does not exist
if (!fs.existsSync("./tmp")) fs.mkdirSync("./tmp")

/**
 * Example 1: Download the routes.dat file
 * from the server and write it to the disk
 * using a stream instead of a full request
 * and sync write
 */
function example01() {
  logger.warn("Starting Example 01...")

  // Create a write stream destination
  const output = fs.createWriteStream("./tmp/routes.dat", {
    encoding: "utf8",
    autoClose: true,
  })

  // Pipe data from the incoming response to
  // the file, writing thefore the response content
  download(routesUrl).then(stream =>
    stream
      .pipe(output)
      .on("close", () => {
        logger.info("Example 1 executed. Created file tmp/routes.dat")
      })
      .on("error", err => {
        logger.error(`Stream failed due to ${err.message}`)
      }),
  )
}

/**
 * Example 2: We gonna parse the download stream
 * and create objects that represent flight routes
 * using the specification provided by openflight.
 *
 * All generated objects are then moved to the
 * tmp/routes.parsed file
 */
function example02() {
  logger.warn("Starting Example 02...")

  // Create write stream to destination file
  const output = fs.createWriteStream("./tmp/routes.parsed")

  // Pipe data from the incoming response to
  // the transform, convert into objects, JSON.stringify
  // this objects and write the result to output
  download(routesUrl).then(stream =>
    stream
      .pipe(toAirtravelRoute())
      .pipe(stringify())
      .pipe(output)
      .on("close", () => {
        logger.info(
          "Example 2 executed. Logged all parsed chunks into tmp/routes.parsed",
        )
      })
      .on("error", err => {
        logger.error(`Stream failed due to ${err.message}`)
      }),
  )
}

/**
 * Main program 1: We gonna parse the download stream,
 * create objects that represent flight routes,
 * add a timestamp to each route for temporal analysis
 * and push data to ElasticSearch.
 */
async function openflightDemo() {
  logger.warn("Starting OpenFlight Demo...")

  download(routesUrl).then(stream => {
    stream
      .pipe(toAirtravelRoute())
      .pipe(addTimestamp())
      .pipe(
        toElasticSearch({
          indexPrefix: "of-routes-",
          type: "openflights/routes",
        }),
      )
      .on("end", () => {
        logger.info("Stream completed! Uploaded flight routes!")
      })
      .on("error", err => {
        logger.error(`Stream failed due to ${err.message}`)
      })
  })
}

/**
 * Main program 2: We gonna extract the zipped file,
 * parse every csv row into objects,
 * create objects that represent recipes
 * and push data to ElasticSearch.
 *
 * BONUS: We can query for recipes using
 * the queryES function to check if recipes
 * are actually indexed.
 */
async function recipesDemo() {
  logger.warn("Starting Recipes Demo...")

  const recipes = fs.createReadStream("recipes.gz")

  const csvParser = csv({
    headers: [
      "name",
      "id",
      "minutes",
      "contributorId",
      "submitted",
      "tags",
      "nutrition",
      "nSteps",
      "steps",
      "description",
      "ingredients",
      "nIngredients",
    ],
    separator: ",",
    /*
      For strings or unknown:
        remove duplicate whitespaces, so words
        like X=A\s\s\sB become X=A\s\B

      For integers:
        parse to int or float

      For arrays:
        number: JSON.parse the array value
        strings: do nothing

      For dates:
        convert into ISO date
    */
    mapValues: ({ header, value }) => {
      // skip header
      if (header === value) return value

      switch (header) {
        case "contributorId":
        case "id":
        case "minutes":
        case "nIngredients":
        case "nSteps":
          return parseInt(value || "", 10)
        case "nutrition":
          return JSON.parse(value)
        case "ingredients":
        case "steps":
        case "tags":
          return value
        case "submitted":
          return new Date(value).toISOString()
        case "description":
        case "name":
        default:
          return (value || "").replace(/\s+/g, " ")
      }
    },
    skipLines: 1, // skip header
  })

  recipes
    .pipe(zlib.createGunzip()) // unzip file
    .pipe(csvParser) // parse CSV lines to object
    .pipe(calories())
    .pipe(
      toElasticSearch({
        indexPrefix: "recipes-",
        type: "recipes",
      }),
    )
    .on("end", () => {
      logger.info("Stream completed! Uploaded recipes!")
    })
    .on("error", err => {
      logger.error(`Stream failed due to ${err.message}`)
    })
}

function findExample(name) {
  let demo

  switch (name) {
    case "stream-download":
      demo = example01
      break
    case "download-parse":
      demo = example02
      break
    case "openflight-to-es":
      demo = openflightDemo
      break
    case "recipes-to-es":
      demo = recipesDemo
      break
    default:
      console.error(
        chalk.red("An unknown option was selected! Please, try again... 🤓"),
      )
      break
  }

  return demo
}

if (process.env.SKIP_CLI_WITH) {
  const fn = findExample(process.env.SKIP_CLI_WITH)

  try {
    fn()
  } catch (e) {
    chalk.red("❌ Something is broken! Please, submit a PR if you've an issue!")
  }

  return
}

/*
 * CLI
 */
clear()

// Print welcome
console.log(chalk.magenta("Welcome to the meet#2 ETL Demo..."))

// Warnings
console.log(chalk.whiteBright("You can exit with Ctrl+C 🏃‍♂️"))

// Prompt for example
inquirer
  .prompt([
    {
      type: "list",
      name: "example",
      message: "Choose your demo:",
      choices: [
        "stream-download",
        "download-parse",
        "openflight-to-es",
        "recipes-to-es",
      ],
      default: "stream-download",
    },
  ])
  .then(({ example }) => {
    let demo = findExample(example)

    try {
      demo()
    } catch (e) {
      console.error(
        chalk.red(
          "❌ Something is broken! Please, submit a PR if you've an issue!",
        ),
      )
    }
  })
