"use strict"

const log = require("@abandon-cli/log")
const color = require("colors/safe")
const semver = require("semver")
const pathExists = require("path-exists").sync
const userHome = require("user-home")
const pkg = require("../package")
const constants = require("./const")

function core() {
	// TODO
	try {
		checkNodeVersion()
		checkPkgVersion()
		checkRoot()
		checkUserHome()
	} catch (error) {
		log.error(error.message)
	}
}

//检查是否有主目录
function checkUserHome() {
	if (!userHome || !pathExists(userHome)) {
		throw new Error(color.red(`当前登录用户主目录不存在`))
	}
}

//检查是否用root账户
function checkRoot() {
	const rootCheck = require("root-check")
	rootCheck()
}

//检查node版本
function checkNodeVersion() {
	const currentNodeVersion = process.version
	const lowestNodeVersion = constants.LOWEST_NODE_VERSION

	if (!semver.gte(currentNodeVersion, lowestNodeVersion)) {
		throw new Error(
			color.red(`abandon-cli需要安装v${lowestNodeVersion}版本的node.js`)
		)
	}
}

//检查包版本
function checkPkgVersion() {
	log.notice("version", pkg.version)
}

module.exports = core
