"use strict"

module.exports = exec

const path = require("path")
const cp = require("child_process")
const Package = require("@abandon-cli/package")
const log = require("@abandon-cli/log")
let pkg
const SETTINGS = {
	init: "@abandon-cli/init",
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
			await pkg.update()
		} else {
			//下载包
			log.verbose("下载包")
			await pkg.install()
		}
	}
	pkg = new Package(options)
	log.verbose("storeDir", options.storeDir)
	log.verbose("targetPath", options.targetPath)
	const rootPath = pkg.getRootFilePath()
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
			const child = spawn("node", ["-e", code], {
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
	//兼容win32
	function spawn(command, args, options) {
		const win32 = process.platform === "win32"
		const cmd = win32 ? "cmd" : command
		const cmdArgs = win32 ? ["/c"].concat(command, args) : args
		return cp.spawn(cmd, cmdArgs, options || {})
	}
}
