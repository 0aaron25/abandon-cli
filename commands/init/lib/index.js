"use strict"

const Command = require("@abandon-cli/command")
const log = require("@abandon-cli/log")
class InitCommand extends Command {
	init() {
		this._pkgName = this._argv[0] || 0
		this._force = this._cmd.force
		log.verbose("pkgName", this._pkgName)
		log.verbose("force", this._force)
	}
	exec() {}
}

function init(argv) {
	new InitCommand(argv)
}

module.exports = init
