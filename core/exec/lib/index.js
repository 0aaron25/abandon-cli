"use strict"

const path = require("path")

const { execSync } = require("@abandon-cli/utils")
const log = require("@abandon-cli/log")
const Package = require("@abandon-cli/package")
let pkg
const SETTINGS = {
	init: "@abandon-cli/init",
	deploy: "@abandon-cli/deploy",
}
const CACHE_DIR = "dependencies"

/**
 * 处理逻辑
 */
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
			log.verbose("更新包")
			await pkg.update()
		} else {
			log.verbose("下载包")
			await pkg.install()
		}
	} else {
		pkg = new Package(options)
	}

	log.verbose("storeDir", options.storeDir)
	log.verbose("targetPath", options.targetPath)
	const rootPath = pkg.getRootFilePath()

	log.verbose("rootPath", rootPath)
	if (rootPath) {
		try {
			// require(rootPath).call(null, Array.from(arguments))
			const argv = Array.from(arguments)
			const _cmd = argv[argv.length - 1]
			//复制cmd对象（瘦身）
			const cloneCmd = Object.create(null)
			Object.keys(_cmd).forEach(key => {
				if (
					_cmd.hasOwnProperty(key) &&
					!key.startsWith("_") &&
					key !== "parent"
				) {
					cloneCmd[key] = _cmd[key]
				}
			})
			argv[argv.length - 1] = cloneCmd
			//加载指令
			const code = `require("${rootPath}").call(null, ${JSON.stringify(argv)})`
			const child = execSync("node", ["-e", code], {
				cwd: process.cwd(),
				stdio: "inherit",
			})
			//子进程报错监控
			child.on("error", err => {
				log.error("命令执行失败", err.message)
				process.exit(1)
			})
			//子进程结束监控
			child.on("exit", e => {
				log.verbose("命令执行完成", e)
				process.exit(e)
			})
		} catch (error) {
			log.error(error.message)
		}
	}
}

module.exports = exec
