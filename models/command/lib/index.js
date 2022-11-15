"use strict"
const color = require("colors/safe")
const semver = require("semver")
const log = require("@abandon-cli/log")

const LOWEST_NODE_VERSION = "14.0.0"

/**
 * 命令
 */
class Command {
	constructor(argv) {
		if (!argv) {
			throw new Error("command参数不能为空")
		}
		if (!Array.isArray(argv)) {
			throw new Error("command参数必须为数组")
		}
		if (argv.length < 1) {
			throw new Error("command参数长度为0")
		}
		this._argv = argv
		const runner = new Promise((resovle, reject) => {
			let chain = Promise.resolve()
			chain = chain.then(() => this.checkNodeVersion())
			chain = chain.then(() => this.initArgs())
			chain = chain.then(() => this.init())
			chain = chain.then(() => this.exec())

			chain.catch(err => {
				log.error(err.message)
			})
		})
	}
	//初始化参数
	initArgs() {
		this._cmd = this._argv[this._argv.length - 1]
		this._argv = this._argv.slice(0, this._argv.length - 1)
	}

	//检查node版本
	checkNodeVersion() {
		const currentNodeVersion = process.version
		const lowestNodeVersion = LOWEST_NODE_VERSION

		if (!semver.gte(currentNodeVersion, lowestNodeVersion)) {
			throw new Error(
				color.red(`abandon-cli需要安装v${lowestNodeVersion}版本的node.js`)
			)
		}
	}

	init() {
		throw new Error("init方法必须实现")
	}
	exec() {
		throw new Error("exec方法必须实现")
	}
}

module.exports = Command
