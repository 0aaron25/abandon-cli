"use strict"
const log = require("@abandon-cli/log")
const exec = require("@abandon-cli/exec")
const color = require("colors/safe")
const semver = require("semver")
const pathExists = require("path-exists").sync
const userHome = require("user-home")
const { Command } = require("commander")
const path = require("path")
const pkg = require("../package")
const constants = require("../lib/const")
const program = new Command()
async function core() {
	// TODO
	try {
		await prepare()
		registerCommand()
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

//创建默认配置
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

//注册命令
function registerCommand() {
	program
		.name(Object.keys(pkg.bin)[0])
		.version(pkg.version)
		.usage("<command> [options]")
		.option("-p,--targetPath <targetPath>", "是否使用本地文件", "")
		.option("-d,--debug", "是否开启调试模式", false)

	program
		.option("-f,--force", "是否强制初始化文件", false)
		.description("初始化项目")
		.command("init <projectName> [options]")
		.action(exec)

	//监听debug模式
	program.on("option:debug", function () {
		if (program.debug) {
			process.env.LOG_LEVEL = "verbose"
		} else {
			process.env.LOG_LEVEL = "info"
		}
		log.level = process.env.LOG_LEVEL
	})
	//监听本地路径
	program.on("option:targetPath", function () {
		process.env.CLI_TARGET_PATH = program.targetPath
	})
	//监听未知命令
	program.on("command:*", function (cmdObj) {
		const availableCmd = program.commands.map(cmd => cmd.name())
		if (cmdObj.length > 0) {
			const unknowedCmd = cmdObj.filter(cmd => !availableCmd.includes(cmd))
			console.log(unknowedCmd)
			log.error(color.red(`未知的命令:${unknowedCmd}`))
		}
		if (availableCmd.length > 0) {
			log.notice(color.green(`可用的命令:${availableCmd.join(",")}`))
		}
	})
	program.parse(process.argv)

	if (program.args && program.args.length < 1) {
		program.outputHelp()
		console.log()
	}
}

async function prepare() {
	checkNodeVersion()
	checkPkgVersion()
	checkRoot()
	checkUserHome()
	checkEnv()
	await checkGlobalUpdate()
}

module.exports = core
