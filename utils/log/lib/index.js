"use strict"

const npmlog = require("npmlog")
/**
 *

 */
npmlog.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info"
npmlog.heading = "abandon"

module.exports = npmlog
