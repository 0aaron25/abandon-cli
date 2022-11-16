"use strict"

const Command = require("@abandon-cli/command")
const log = require("@abandon-cli/log")
const { spinnerStart, sleep, exec } = require("@abandon-cli/utils")
const { homedir } = require("os")
const Package = require("@abandon-cli/package")
const formatPath = require("@abandon-cli/format-path")
const fs = require("fs")
const fse = require("fs-extra")
const inquirer = require("inquirer")
const validate = require("validate-npm-package-name")
const API = require("./projectApi")
const ejs = require("ejs")
const glob = require("glob")

const path = require("path")
const {
	TYPE_PROJECT,
	TYPE_COMPONENT,
	WHITE_LIST_FILE,
	DEFAULT_TEMPLATE_TYPE,
	WHITE_LIST_COMMAND,
	TOKEN_EXPIRE_TIME,
} = require("./const")
const {
	projectTypePromt,
	projectVersionPromt,
	projectNamePrompt,
	projectChoicePromt,
	projectDeployNamePrompt,
	projectLoginPasswordPromt,
	projectLoginUserNamePromt,
	projectLoginCodePromt,
} = require("./projectPrompt")

/**
 * 初始化命令
 */
class InitCommand extends Command {
	/**
	 * @description 下载模版
	 */
	async downLoadTemplate() {
		// console.log(this.projectInfo);
		const { projectTemplate } = this.projectInfo
		this.templateInfo = this.template.find(item => {
			return item.npmName == projectTemplate
		})
		const { npmName: packageName, version: packageVersion } = this.templateInfo

		const targetPath = path.resolve(process.env.CLI_HOME, "template") // 生成缓存路径
		const storeDir = path.resolve(targetPath, "node_modules")

		const templatePkg = new Package({
			targetPath,
			storeDir,
			packageName,
			packageVersion,
		})

		if (!(await templatePkg.exists())) {
			const spinner = spinnerStart("正在下载模版")
			await sleep()
			try {
				await templatePkg.install()
			} catch (error) {
				throw error
			} finally {
				spinner.stop(true)
				if (await templatePkg.exists()) {
					log.info("模版下载成功")
					this.templatePkg = templatePkg
				}
			}
		} else {
			const spinner = spinnerStart("正在更新模版")
			await sleep()
			try {
				await templatePkg.update()
			} catch (error) {
				throw error
			} finally {
				spinner.stop(true)
				if (await templatePkg.exists()) {
					log.info("模版更新成功")
					this.templatePkg = templatePkg
					console.log("模版更新成功", this.templatePkg)
				}
			}
		}
	}
	/**
	 * @description 安装模版
	 */
	async installTemplate() {
		const typeMap = [
			["custom", this.installCustomTemplate],
			["normal", this.installNormalTemplate],
		]
		if (!this.templateInfo) {
			throw new Error("项目模版信息不存在")
		}

		!this.templateInfo.type && (this.templateInfo.type = DEFAULT_TEMPLATE_TYPE)
		const target = typeMap.find(v => v[0] == this.templateInfo.type)
		if (target) {
			await target[1].call(this)
		} else {
			throw new Error("无法识别项目模版类型")
		}
	}
	/**
	 * @description 检查是否合法指令
	 */
	checkValidCommand(cmd) {
		return WHITE_LIST_COMMAND.includes(cmd)
	}

	/**
	 * @description  执行指令
	 */
	async execCommand(exeCommand, errMsg) {
		let execResult = []
		return new Promise(async (resolve, reject) => {
			if (!exeCommand || exeCommand.length == 0) {
				return reject("执行指令无效")
			}

			for (let i = 0; i < exeCommand.length; i++) {
				const commandArgs = exeCommand[i].split(" ")
				const command = commandArgs[0]
				if (!this.checkValidCommand(command)) {
					return reject("执行指令不合法")
				}

				const args = commandArgs.slice(1)

				const result = await exec(command, args, {
					cwd: process.cwd(),
					stdio: "inherit",
				})

				execResult.push(result)
			}
			if (execResult.some(v => v !== 0)) {
				return reject(errMsg)
			}

			resolve(execResult)
		}).catch(error => {
			throw new Error(error)
		})
	}

	/**
	 * @description ejs模版渲染
	 */
	ejsRender() {
		const dir = process.cwd()
		const options = {
			ignore: ["node_modules/**", "public/**", "src/**"],
			nodir: true,
			cwd: dir,
			dot: true,
		}
		const projectInfo = this.projectInfo
		return new Promise((resolve, reject) => {
			glob("**/*", options, function (err, files) {
				console.log(files)
				if (err) {
					return reject(err)
				}

				Promise.all(
					files.map(async file => {
						const filePath = path.resolve(dir, file)
						const str = await ejs.renderFile(filePath, projectInfo, {})
						fs.writeFileSync(filePath, str)
					})
				)
				resolve("ejs渲染成功")
			})
		})
	}

	/**
	 * @description 安装自定义模版
	 */
	async installCustomTemplate() {
		console.log("installCustomTemplate", this.templatePkg)
	}
	/**
	 * @description 安装普通模版
	 */
	async installNormalTemplate() {
		console.log("installNormalTemplate", this.templatePkg)
		const templatePath = path.resolve(
			this.templatePkg.cacheFilePath,
			"template"
		)
		const currentPath = process.cwd()
		fse.ensureDirSync(templatePath)
		fse.ensureDirSync(currentPath)
		const spinner = spinnerStart("正在下载模版")
		await sleep()
		try {
			fse.copySync(templatePath, currentPath)
		} catch (error) {
			throw error
		} finally {
			spinner.stop(true)
			log.info("模版安装成功")
		}

		const ejsStatus = await this.ejsRender()
		log.info(ejsStatus)

		const { startCommand, installCommand } = this.templateInfo

		//安装依赖
		await this.execCommand(
			installCommand,
			"安装项目依赖失败,可以手动执行指令:npm install"
		)
		//启动项目
		await this.execCommand(
			startCommand,
			"启动项目失败,可以查看package.json启动命令"
		)
	}
	/**
	 * @description 检查本地路径
	 */
	checkLocalPath(localpath) {
		const win32 = process.platform === "win32"

		return win32 ? formatPath(localpath) : localpath
	}

	/**
	 * @description voss后台登陆
	 */
	async login() {
		const userInfoStorePath = path.resolve(homedir(), ".abandonInfo")
		let userInfo
		//读取用户信息是否已经登陆
		if (!(await fse.pathExists(userInfoStorePath))) {
			userInfo = await inquirer.prompt([
				projectLoginUserNamePromt,
				projectLoginPasswordPromt,
				projectLoginCodePromt,
			])
		} else {
			const data = fse.readJSONSync(userInfoStorePath)
			const currentDate = new Date().getTime()
			let isExpire = currentDate - data.oldDate >= TOKEN_EXPIRE_TIME
			log.verbose("isExpire", isExpire)
			if (isExpire) {
				fse.removeSync(userInfoStorePath)
				userInfo = await inquirer.prompt([
					projectLoginUserNamePromt,
					projectLoginPasswordPromt,
					projectLoginCodePromt,
				])
			} else {
				return data
			}
		}
		// 发送请求，获取token
		const result = await API.Login(userInfo)
		if (!result.success) {
			throw new Error(result.msg)
		}

		// 保存用户信息，写入文件
		const oldDate = new Date().getTime()

		fse.outputJSONSync(userInfoStorePath, {
			oldDate,
			...result.data,
		})

		return result.data
	}

	/**
	 * @description 获取项目模版信息
	 */
	async getProjectInfo() {
		let projectInfo = {}
		const projectPrompt = []

		//选择项目还是组件
		const { type } = await inquirer.prompt(projectTypePromt)
		process.env.PROJECT_TYPE = type
		const isValidPkgName = validate(this._pkgName).validForNewPackages

		//选择项目后逻辑
		const _processProjectPromt = async () => {
			//检查包名跳过输入
			if (isValidPkgName) {
				projectInfo["projectName"] = this._pkgName
			} else {
				projectPrompt.push(projectNamePrompt)
			}

			projectPrompt.push(projectVersionPromt)
			projectPrompt.push(projectDeployNamePrompt)

			//选择模版
			const choices = this.formatTemplateInfo(this.template)
			projectChoicePromt.choices = choices
			projectPrompt.push(projectChoicePromt)

			const project = await inquirer.prompt(projectPrompt)
			projectInfo = {
				...projectInfo,
				...project,
			}
		}
		//选择组件后逻辑
		const _processComponentPromt = () => {}

		switch (type) {
			case TYPE_PROJECT:
				await _processProjectPromt()
				break
			case TYPE_COMPONENT:
				_processComponentPromt()
				break
		}

		return projectInfo
	}

	/**
	 * @description 检查目录是否为空
	 * @param {*} localPath
	 * @returns
	 */
	isDirEmpty(localPath) {
		log.verbose("localPath", localPath)
		let fileNames = fs.readdirSync(localPath)
		fileNames = fileNames.filter(
			fileName => !WHITE_LIST_FILE.includes(fileName)
		)
		return !fileNames || fileNames.length <= 0
	}

	/**
	 * @description 对请求回来的模版信息加工
	 * @param {*} template
	 * @returns
	 */
	formatTemplateInfo(template) {
		return template.map(item => {
			return {
				value: item.npmName,
				name: item.name,
			}
		})
	}
	init() {
		this._pkgName = this._argv[0] || 0
		this._force = this._cmd.force
		log.verbose("pkgName", this._pkgName)
		log.verbose("force", this._force)
	}
	async prepare(token, uid) {
		//1.查看有没有项目模版
		const result = await API.getProjectTemplate(token, uid)
		if (!result.success) {
			throw new Error(result.msg)
		}
		const template = JSON.parse(result.data.list.val)
		this.template = template
		if (!template || template.length == 0) {
			throw new Error("项目模版为空")
		}

		const localPath = this.checkLocalPath(process.cwd())

		// log.verbose(localPath)

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
	async exec() {
		const { token, uid } = await this.login()
		const projectInfo = await this.prepare(token, uid)
		console.log(projectInfo)
		this.projectInfo = projectInfo

		log.verbose("projectInfo", projectInfo)

		if (projectInfo) {
			await this.downLoadTemplate()
			await this.installTemplate()
		}
	}
}

function init(argv) {
	new InitCommand(argv)
}

module.exports = init
