"use strict"

/**
 *
 * @param {*} 是否为对象
 * @return
 */

function isObject(obj) {
	return Object.prototype.toString.call(obj) === "[object Object]"
}

function spinnerStart(text, loadingEffort = "|/-\\") {
	const Spinner = require("cli-spinner").Spinner
	const spinner = new Spinner(text + ".. %s")
	spinner.setSpinnerString(loadingEffort)
	spinner.start()
	return spinner
}

function sleep(time = 1000) {
	return new Promise(resolve => setTimeout(resolve, time))
}

function execSync(command, args, options) {
	const win32 = process.platform === "win32"
	const cmd = win32 ? "cmd" : command
	const cmdArgs = win32 ? ["/c"].concat(command, args) : args
	return require("child_process").spawn(cmd, cmdArgs, options || {})
}

function exec(command, args, options) {
	return new Promise((resolve, reject) => {
		const result = execSync(command, args, options)
		result.on("exit", res => {
			console.log("exit", res)
			resolve(res)
		})

		result.on("error", err => {
			reject(err)
		})
	})
}

module.exports = {
	isObject,
	spinnerStart,
	sleep,
	execSync,
	exec,
}
