"use strict"

const inquirer = require("inquirer")

const Command = require("@abandon-cli/command")
const glob = require("glob")
const path = require("path")
const { exec } = require("@abandon-cli/utils")
const log = require("@abandon-cli/log")
const { homedir } = require("os")
const pkgDir = require("pkg-dir").sync
const DEPLOY_NPM_PKG = "abandon-deploy/lib/deploy.js"
const pathExists = require("path-exists").sync
const deployPromt = {
	name: "type",
	message: "请选择发布的环境",
	type: "list",
	default: "test",
	choices: [
		{ name: "测试服", value: "test" },
		{ name: "正式服", value: "production" },
	],
}

class DeployCommand extends Command {
	async prepare() {
		// 生成参数
		let argumentsString = ""
		for (let key in this._argv[0]) {
			if (this._argv[0][key]) {
				argumentsString += `--${key} `
			}
		}
		console.log(argumentsString)

		const { type } = await inquirer.prompt(deployPromt)
		const deployPath = path.resolve(
			pkgDir(__filename),
			"node_modules",
			DEPLOY_NPM_PKG
		)
		let code = [deployPath]
		let dotEnvPath = path.resolve(process.cwd(), ".env")

		//判断是否为生产环境
		if (type == "production") {
			code.push(type)
			dotEnvPath = path.resolve(process.cwd(), ".env.production")
		}
		if (!pathExists(dotEnvPath)) {
			throw new Error(`${dotEnvPath}不存在`)
		}

		//获取env文件信息
		const { parsed } = require("dotenv").config({
			path: dotEnvPath,
		})
		const comfirmPromt = {
			name: "deploy",
			message: `部署在服务器路径：${parsed.DEPLOY_PATH}`,
			default: true,
			type: "list",
			choices: [
				{ name: "是", value: true },
				{ name: "否", value: false },
			],
		}
		const { deploy } = await inquirer.prompt(comfirmPromt)

		if (!deploy) {
			throw new Error("取消发布")
		}
		//获取本地env文件服务器密码
		const userHomeDevFilePath = path.resolve(homedir(), ".env")
		const { parsed: userHomeInfo } = require("dotenv").config({
			path: userHomeDevFilePath,
		})

		//执行指令
		if (userHomeInfo.SERVER_PASSWARD && code) {
			exec(
				`echo ${userHomeInfo.SERVER_PASSWARD} | node ${code} ${argumentsString} `,
				{
					cwd: process.cwd(),
					stdio: "inherit",
					shell: true,
				}
			).then((res) => {
				if (res === 0) {
					log.notice("浏览器地址:", parsed.URL)
				}
			})
		}
	}

	init() {}
	async exec() {
		await this.prepare()
	}
}

function deploy(argv) {
	// TODO
	new DeployCommand(argv)
}

module.exports = deploy
