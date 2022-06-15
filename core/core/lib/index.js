"use strict"

const log = require("@abandon-cli/log")

function core() {
	// TODO
	checkPkgVersion()
}

const pkg = require("../package")
function checkPkgVersion() {
	log.notice("version", pkg.version)
}

module.exports = core
