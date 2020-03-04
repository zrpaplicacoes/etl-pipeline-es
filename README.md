<p align="center">
  <img src="./logo.png" style="width: 500px;">
</p>

<p align="center" style="padding-top: 64px; padding-bottom: 32px;">
  <a href="https://zrp.com.br" target="_blank">
    <img
      alt="About"
      src="https://img.shields.io/badge/made%20with%20love-zrp-orange"
    />
  </a>

  <a href="https://zrp.com.br/jobs" target="_blank">
     <img
      alt="Join the Team"
      src="https://img.shields.io/badge/join%20the%20team-jobs-blue"
    />
  </a>

  <a href="https://zrp.revelo.com.br/" target="_blank">
     <img
      alt="Job Opportunities"
      src="https://img.shields.io/badge/revelo%20-opportunities-red"
    />
  </a>
</p>

# ETL with ES (Revelo Edition)

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

The presentation for this repository can be found [here](https://docs.google.com/presentation/d/156Cpbt6ZYnDWdzMQwdhkmnOc5h-7cAe_fM6nQMxDHXA/edit?usp=sharing) 📚.

<p align="center">
  <img src="demo.gif?raw=true"/>
</p>

This application is a demo app that uses node streams to extract, transform and push data from two sources, openflights and a gzip csv file containing recipes from [kaggle](https://www.kaggle.com/shuyangli94/food-com-recipes-and-user-interactions/version/2), generating two types of documents (`openflights/routes` and `recipes`) on ElasticSearch for querying and analysis, implementing a simple ETL pipeline 🤓.

Feel free to submit new requests, ask questions or submit pull requests to improve the codebase. ✨

## System Requirements

For basic execution, you must have the following software installed and configured on your computer 🖥.

- nodejs: `~8`
- npm: `~5.2`

## About this repository

This repository is under the MIT license. For proper information about this license, please refer to [LICENSE.md](https://github.com/zrpaplicacoes/demo-etl-pipeline-elasticsearch/blob/master/LICENSE.md). Feel free to submit questions regarding the license and using or this application.

## Running the project 🏃‍♂️

First of all, install all deps using `npm i`.

Copy the `.env.example` file to `.env` and replace the variables with your own variables. After setuping the project, you can run the demo using `npm start`. This will open a CLI, just choose the desired option and await until execution completes!

## Documentation

For documentation about the latest version, run `npm run docs` and open `http://localhost:2222`.

## Environment Variables

|Name|Description|Default Value|
|-|-|-|
|AWS_ACCESS_KEY_ID|Amazon provided key|-|
|AWS_SECRET_ACCESS_KEY|Amazon provided secret|-|
|NODE_ENV| Defines the current execution environment for application |development|
|SERVICE_NAME|The service name on log metadata|UNKNOWN|
|ES_DOMAIN| The AWS Endpoint for the ElasticSearch cluster|-|
|LOG_FAILED_ES_RESPONSES|When true, log failed requests for debugging|-|
|LOG_SUCCESS_ES_RESPONSES|When true, log success requests for debugging|-|
|CONCURRENCY|Number of parallel write streams to create for posting /_bulk requests to ElasticSearch|1|
|LOG_LEVEL|Sets the log level for the derived winston logger|prod: info, others: silly|
