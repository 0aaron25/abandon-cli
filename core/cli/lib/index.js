"use strict"
const log = require("@abandon-cli/log")
const color = require("colors/safe")
const semver = require("semver")
const pathExists = require("path-exists").sync
const { homedir } = require("os")
const { Command } = require("commander")
const path = require("path")
const pkg = require("../package")
const constants = require("../lib/const")
const exec = require("@abandon-cli/exec")
const program = new Command()





/**
 * @description 检查是否需要更新
 */
async function checkGlobalUpdate() {
	log.notice("checkGlobalUpdate")
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
/**
 * @description 检查环境变量
 */
function checkEnv() {
	log.notice("checkEnv")
	const dotEnvPath = path.resolve(homedir(), ".env")
	if (pathExists(dotEnvPath)) {
		require("dotenv").config({
			path: dotEnvPath,
		})
	}
	createDefaultConfig()
}
/**
 * @description 创建默认配置
 */
function createDefaultConfig() {
	const cli_config = {
		HOME: homedir(),
	}
	if (process.env.CLI_HOME) {
		cli_config["CLI_HOME"] = path.resolve(homedir(), process.env.CLI_HOME)
	} else {
		cli_config["CLI_HOME"] = path.resolve(homedir(), constants.DEFAULT_CLI_HOME)
	}
	for (let key in cli_config) {
		process.env[key] = cli_config[key]
	}
}
/**
 * @description 检查是否有主目录
 */
function checkUserHome() {
	log.notice("checkUserHome")
	if (!homedir() || !pathExists(homedir())) {
		throw new Error(color.red(`当前登录用户主目录不存在`))
	}
}
/**
 * @description 检查是否用root账户
 */
function checkRoot() {
	log.notice("checkRoot")
	const rootCheck = require("root-check")
	rootCheck()
}

/**
 * @description 打印包版本
 */
function checkPkgVersion() {
	log.notice("version", pkg.version)
}

/**
 * @description 注册命令
 */
function registerCommand() {
	console.log("registerCommand2")
	program
		.name(Object.keys(pkg.bin)[0])
		.version(pkg.version, "-v,--version", "查看包版本")
		.addHelpCommand(false)
		.helpOption("-h,--help", "查看帮助文档")
		.usage("<command> [options]")
		.option("-p,--targetPath <targetPath>", "本地文件路径")
		.option("-d,--debug", "开启调试模式")

	program.on("option:debug", function () {
		const debug = this.opts().debug
		if (debug) {
			process.env.LOG_LEVEL = "verbose"
		} else {
			process.env.LOG_LEVEL = "info"
		}
		log.level = process.env.LOG_LEVEL
	})

	program.on("option:targetPath", function () {
		process.env.CLI_TARGET_PATH = this.opts().targetPath
	})

	program.on("command:*", function (cmdObj) {
		console.log(cmdObj)
		const availableCmd = program.commands.map((cmd) => cmd.name())
		if (cmdObj.length > 0) {
			const unknowedCmd = cmdObj.filter((cmd) => !availableCmd.includes(cmd))
			log.error(color.red(`未知的命令:${unknowedCmd}`))
		}
		if (availableCmd.length > 0) {
			log.notice(color.green(`可用的命令:${availableCmd.join(",")}`))
		}
	})
	program
		.command("init [projectName]")
		.option("-f,--force", "是否强制初始化文件", false)
		.action(exec)
	program
		.command("deploy")
		.option("-t,--tgz", "是否生成缓存文件", false)
		.action(exec)

	program.parse(process.argv)
	if (program.args && program.args.length < 1) {
		program.outputHelp()
	}
}

async function prepare() {
	checkPkgVersion()
	checkRoot()
	checkUserHome()
	checkEnv()
	await checkGlobalUpdate()
}

async function core() {
	try {
		await prepare()
		registerCommand()
	} catch (error) {
		log.error(error.message)
	}
}

module.exports = core
