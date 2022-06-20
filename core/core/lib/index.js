"use strict"

const log = require("@abandon-cli/log")
const color = require("colors/safe")
const semver = require("semver")
const pathExists = require("path-exists").sync
const userHome = require("user-home")
const path = require("path")
const pkg = require("../package")
const constants = require("./const")
let args
async function core() {
	// TODO
	try {
		checkNodeVersion()
		checkPkgVersion()
		checkRoot()
		checkUserHome()
		checkInputArgs()
		checkEnv()
		await checkGlobalUpdate()
	} catch (error) {
		log.error(error.message)
	}
}

//检查是否需要更新
async function checkGlobalUpdate() {
	const { getNpmSemverVersion } = require("@abandon-cli/get-npm-info")
	const baseVersion = pkg.version
	const pkgName = pkg.name
	const lastestVersion = await getNpmSemverVersion(baseVersion, pkgName)
	if (lastestVersion && semver.gt(lastestVersion, baseVersion)) {
		log.warn(
			color.yellow(`检查到${pkgName}有新版本，请及时更新
	     当前版本为${baseVersion},最新版本为${lastestVersion}
	     安装命令为：npm install -g ${pkgName}	
		`)
		)
	}
}

//检查环境变量
function checkEnv() {
	const dotEnvPath = path.resolve(userHome, ".env")
	if (pathExists(dotEnvPath)) {
		require("dotenv").config({
			path: dotEnvPath,
		})
	}
	createDefaultConfig()
}

function createDefaultConfig() {
	const cli_config = {
		HOME: userHome,
	}
	if (process.env.CLI_HOME) {
		cli_config["CLI_HOME"] = path.resolve(userHome, process.env.CLI_HOME)
	} else {
		cli_config["CLI_HOME"] = path.resolve(userHome, constants.DEFAULT_CLI_HOME)
	}
	for (let key in cli_config) {
		process.env[key] = cli_config[key]
	}
}

//检查入参
function checkInputArgs() {
	const minimist = require("minimist")
	args = minimist(process.argv.slice(2))
	checkArgs()
}

function checkArgs() {
	if (args.debug) {
		process.env.LOG_LEVEL = "verbose"
	} else {
		process.env.LOG_LEVEL = "info"
	}
	log.level = process.env.LOG_LEVEL
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
