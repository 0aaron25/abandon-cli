'use strict'

const Command = require('@abandon-cli/command')
const log = require('@abandon-cli/log')
const { spinnerStart, sleep, exec } = require('@abandon-cli/utils')
const { homedir } = require('os')
const Package = require('@abandon-cli/package')
const formatPath = require('@abandon-cli/format-path')
const fs = require('fs')
const fse = require('fs-extra')
const inquirer = require('inquirer')
const validate = require('validate-npm-package-name')
const API = require('./projectApi')
const ejs = require('ejs')
const glob = require('glob')

const path = require('path')
const { WHITE_LIST_FILE, DEFAULT_TEMPLATE_TYPE, WHITE_LIST_COMMAND, TOKEN_EXPIRE_TIME } = require('./const')
const {
	loginPromt,
	projectVersionPromt,
	projectNamePrompt,
	projectChoicePromt,
	projectDeployNamePrompt,
	folderEmptyPromt,
	folderForceEmptyPromt,
	titlePrompt,
} = require('./projectPrompt')

/**
 * 初始化命令
 */
class InitCommand extends Command {
	/**
	 * @description 下载模版
	 */
	async downLoadTemplate() {
		const { projectTemplate } = this.projectInfo
		this.templateInfo = this.template.find((item) => {
			return item.npmName == projectTemplate
		})
		const { npmName: packageName, version: packageVersion } = this.templateInfo

		const targetPath = path.resolve(process.env.CLI_HOME, 'template') // 生成缓存路径
		const storeDir = path.resolve(targetPath, 'node_modules')

		this.templatePkg = new Package({
			targetPath,
			storeDir,
			packageName,
			packageVersion,
		})

		this.exist = await this.templatePkg.exists()

		if (!this.exist) {
			await this.loadTemplate('install', '正在下载模版', '模版下载成功')
		} else {
			await this.loadTemplate('update', '正在更新模版', '模版更新成功')
		}
	}
	/**
	 * @description 安装模版
	 * @param tag 只支持 update 和 install
	 */
	async loadTemplate(tag, startMsg, endMsg) {
		const spinner = spinnerStart(startMsg)
		await sleep()
		try {
			await this.templatePkg[tag]()
		} catch (error) {
			throw error
		} finally {
			spinner.stop(true)
			if (this.exist) {
				log.info(endMsg)
			}
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
				return reject('执行指令无效')
			}

			for (let i = 0; i < exeCommand.length; i++) {
				const commandArgs = exeCommand[i].split(' ')
				const command = commandArgs[0]
				if (!this.checkValidCommand(command)) {
					return reject('执行指令不合法')
				}

				const args = commandArgs.slice(1)

				const result = await exec(command, args, {
					cwd: process.cwd(),
					stdio: 'inherit',
				})

				execResult.push(result)
			}
			if (execResult.some((v) => v !== 0)) {
				return reject(errMsg)
			}

			resolve(execResult)
		}).catch((error) => {
			throw new Error(error)
		})
	}

	/**
	 * @description ejs模版渲染
	 */
	ejsRender() {
		const dir = process.cwd()
		const options = {
			ignore: ['node_modules/**', 'public/**', 'src/**'],
			nodir: true,
			cwd: dir,
			dot: true,
		}
		const projectInfo = this.projectInfo
		return new Promise((resolve, reject) => {
			glob('**/*', options, function (err, files) {
				if (err) {
					return reject(err)
				}

				Promise.all(
					files.map(async (file) => {
						const filePath = path.resolve(dir, file)
						const str = await ejs.renderFile(filePath, projectInfo, {})
						fs.writeFileSync(filePath, str)
					}),
				)
				resolve('ejs渲染成功')
			})
		})
	}

	/**
	 * @description 安装模版
	 */
	async installTemplate() {
		const templatePath = path.resolve(this.templatePkg.cacheFilePath, 'template')
		const currentPath = process.cwd()
		fse.ensureDirSync(templatePath)
		fse.ensureDirSync(currentPath)
		const spinner = spinnerStart('正在下载模版')
		await sleep()
		try {
			fse.copySync(templatePath, currentPath)
		} catch (error) {
			throw error
		} finally {
			spinner.stop(true)
			log.info('模版安装成功')
		}

		const ejsStatus = await this.ejsRender()
		log.info(ejsStatus)

		const { startCommand, installCommand } = this.templateInfo

		//安装依赖
		await this.execCommand(installCommand, '安装项目依赖失败,可以手动执行指令:npm install')
		//启动项目
		await this.execCommand(startCommand, '启动项目失败,可以查看package.json启动命令')
	}
	/**
	 * @description 检查本地路径
	 */
	formatLocalPath(localpath) {
		const win32 = process.platform === 'win32'

		return win32 ? formatPath(localpath) : localpath
	}

	/**
	 * @description voss后台登陆
	 */
	async login() {
		const userInfoStorePath = path.resolve(homedir(), '.abandonInfo')
		let loginInfo
		let data
		//读取用户信息是否已经登陆
		if (!(await fse.pathExists(userInfoStorePath))) {
			loginInfo = await inquirer.prompt(loginPromt)
		} else {
			data = fse.readJSONSync(userInfoStorePath)
			const currentDate = new Date().getTime()
			let isExpire = currentDate - data.oldDate >= TOKEN_EXPIRE_TIME
			log.verbose('isExpire', isExpire)
			if (isExpire) {
				fse.removeSync(userInfoStorePath)
				loginInfo = await inquirer.prompt(loginPromt)
			} else {
				this.userInfo = data
				return data
			}
		}
		// 发送请求，获取token
		const { data: response } = await API.Login(loginInfo)
		data = response
		// 保存用户信息，写入文件
		const oldDate = new Date().getTime()

		fse.outputJSONSync(userInfoStorePath, {
			oldDate,
			...data,
		})

		this.userInfo = data

		return data
	}

	/**
	 * @description 获取项目模版信息
	 */
	async getProjectInfo() {
		let projectInfo = {}
		const projectPrompt = []
		// 交互的逻辑
		const promts = [projectVersionPromt, projectDeployNamePrompt, titlePrompt]

		//检查参数包名是否合法
		const isValidPkgName = validate(this._pkgName).validForNewPackages

		//检查包名跳过输入
		if (isValidPkgName) {
			projectInfo['name'] = this._pkgName
			projectDeployNamePrompt['default'] = this._pkgName
		} else {
			projectPrompt.push(projectNamePrompt)
		}

		promts.forEach((promt) => projectPrompt.push(promt))

		//选择模版
		const choices = this.formatTemplateInfo(this.template)
		projectChoicePromt.choices = choices
		projectPrompt.push(projectChoicePromt)

		const info = await inquirer.prompt(projectPrompt)
		projectInfo = {
			...projectInfo,
			...info,
		}

		return projectInfo
	}

	/**
	 * @description 检查目录是否为空
	 * @param {*} localPath
	 * @returns
	 */
	isDirEmpty(localPath) {
		log.verbose('localPath', localPath)
		let fileNames = fs.readdirSync(localPath)
		fileNames = fileNames.filter((fileName) => !WHITE_LIST_FILE.includes(fileName))
		return !fileNames || fileNames.length <= 0
	}

	/**
	 * @description 对请求回来的模版信息加工
	 * @param {*} template
	 * @returns
	 */
	formatTemplateInfo(template) {
		return template.map((item) => {
			return {
				value: item.npmName,
				name: item.name,
			}
		})
	}
	init() {
		this._pkgName = this._argv[0] || 0
		this._force = this._cmd.force
		log.verbose('pkgName', this._pkgName)
		log.verbose('force', this._force)
	}
	async prepare() {
		const { token, uid } = this.userInfo
		//1.查看有没有项目模版 data.list.val
		const {
			data: {
				list: { val: template },
			},
		} = await API.getProjectTemplate(token, uid)
		this.template = JSON.parse(template)
		if (!template || template.length == 0) {
			throw new Error('项目模版为空,请去voss后台添加模版')
		}

		const localPath = this.formatLocalPath(process.cwd())

		await this.checkFolderIfEmpty(localPath)

		return await this.getProjectInfo()
	}
	async checkFolderIfEmpty(localPath) {
		// 检查目录是否为空
		let isContinueCreate = false
		const empty = this.isDirEmpty(localPath)
		if (!empty) {
			if (!this._force) {
				const { continueCreate } = await inquirer.prompt(folderEmptyPromt)
				isContinueCreate = continueCreate
				!isContinueCreate && process.exit()
			}
			if (isContinueCreate || this._force) {
				const { isForceUpdate } = await inquirer.prompt(folderForceEmptyPromt)
				if (isForceUpdate) {
					fse.emptyDirSync(localPath)
				} else {
					process.exit()
				}
			}
		}
	}

	async exec() {
		await this.login()
		const projectInfo = await this.prepare()
		this.projectInfo = projectInfo
		if (!projectInfo) {
			throw new Error('获取项目信息失败')
		}
		await this.downLoadTemplate()
		await this.installTemplate()
	}
}

function init(argv) {
	new InitCommand(argv)
}

module.exports = init
