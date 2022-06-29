"use strict"

module.exports = exec

const path = require("path")
const Package = require("@abandon-cli/package")
const log = require("@abandon-cli/log")
let pkg
const SETTINGS = {
	// init: "@abandon-cli/init",
	init: "@imooc-cli/init",
}
const CACHE_DIR = "dependencies"

async function exec() {
	const homePath = process.env.CLI_HOME
	const cmdObj = arguments[arguments.length - 1]
	const cmdName = cmdObj.name()
	const options = {
		packageName: SETTINGS[cmdName],
		packageVersion: "latest",
		targetPath: process.env.CLI_TARGET_PATH,
	}
	if (!process.env.CLI_TARGET_PATH) {
		//1.生成缓存路径
		options.targetPath = path.resolve(homePath, CACHE_DIR)
		options.storeDir = path.resolve(options.targetPath, "node_modules")
		pkg = new Package(options)
		//2.生成缓存文件夹
		if (await pkg.exists()) {
			//更新包
			log.verbose("更新包")
		} else {
			//下载包
			log.verbose("下载包")
			await pkg.install()
		}
	}
	pkg = new Package(options)

	log.verbose("storeDir", options.storeDir)
	log.verbose("targetPath", options.targetPath)
}
