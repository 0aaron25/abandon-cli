"use strict"

const Command = require("@abandon-cli/command")
const log = require("@abandon-cli/log")
const fs = require("fs")
const fse = require("fs-extra")
const inquirer = require("inquirer")
const validate = require("validate-npm-package-name")
const { TYPE_PROJECT, TYPE_COMPONENT } = require("./const")
const {
	projectTypePromt,
	projectVersionPromt,
	projectNamePrompt,
} = require("./projectPrompt")
class InitCommand extends Command {
	init() {
		this._pkgName = this._argv[0] || 0
		this._force = this._cmd.force
		log.verbose("pkgName", this._pkgName)
		log.verbose("force", this._force)
	}
	async exec() {
		const projectInfo = await this.prepare()
		console.log(projectInfo)
	}
	async prepare() {
		const localPath = process.cwd()
		if (!this.isDirEmpty(localPath)) {
			let isContinueCreate = false
			//1.询问用户是否需要继续创建
			if (!this._force) {
				isContinueCreate = (
					await inquirer.prompt({
						type: "confirm",
						name: "isContinueCreate",
						default: false,
						message: "当前文件夹不为空，是否继续创建项目",
					})
				).isContinueCreate
				if (!isContinueCreate) return
			}
			//2.判断用户是否传入了force(同样询问是否清空目录,强制更新)
			if (isContinueCreate || this._force) {
				const { isForceUpdate } = await inquirer.prompt({
					type: "confirm",
					name: "isForceUpdate",
					default: false,
					message: "是否确认清空当前目录下的文件?",
				})
				//清空当前目录
				isForceUpdate && fse.emptyDirSync(localPath)
			}
		}
		return await this.getProjectInfo()
	}
	async getProjectInfo() {
		//项目信息
		let projectInfo = {}
		//用户需要交互的promt
		const projectPrompt = []

		//1.选择项目还是组件
		const { type } = await inquirer.prompt(projectTypePromt)
		log.verbose("type", type)
		process.env.PROJECT_TYPE = type
		//验证包名是否合法
		const isValidPkgName = validate(this._pkgName).validForNewPackages
		log.verbose("isValidPkgName", isValidPkgName)

		const _processProjectPromt = async () => {
			//合法跳过输入
			isValidPkgName && (projectInfo["pkgName"] = this._pkgName)
			!isValidPkgName && projectPrompt.push(projectNamePrompt)
			// 输入版本号
			projectPrompt.push(projectVersionPromt)

			const project = await inquirer.prompt(projectPrompt)
			projectInfo = {
				...projectInfo,
				...project,
			}
		}

		switch (type) {
			case TYPE_PROJECT:
				await _processProjectPromt()
				break
			case TYPE_COMPONENT:
				console.log("TYPE_COMPONENT", TYPE_COMPONENT)
				break
		}

		return projectInfo
	}

	//检查目录是否为空
	isDirEmpty(localPath) {
		log.verbose("localPath", localPath)
		let fileNames = fs.readdirSync(localPath)
		fileNames = fileNames.filter(
			fileName => !["node_modules", ".git"].includes(fileName)
		)
		return fileNames && fileNames.length <= 0
	}
}

function init(argv) {
	new InitCommand(argv)
}

module.exports = init
