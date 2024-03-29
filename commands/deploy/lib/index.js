'use strict'

const inquirer = require('inquirer')

const Command = require('@abandon-cli/command')
const glob = require('glob')
const fse = require('fs-extra')
const path = require('path')
const { exec, execSync } = require('@abandon-cli/utils')
const log = require('@abandon-cli/log')
const { homedir } = require('os')
const pkgDir = require('pkg-dir').sync
const DEPLOY_NPM_PKG = 'abandon-deploy/lib/deploy.js'
const pathExists = require('path-exists').sync
const dotEnv = require('dotenv')
const deployPromt = {
	name: 'environment',
	message: '请选择发布的环境',
	type: 'list',
	default: 'test',
	choices: [
		{ name: '测试服', value: 'test' },
		{ name: '正式服', value: 'production' },
	],
}
const deployTypePromt = {
	name: 'type',
	message: '请选择发布的类型',
	type: 'list',
	default: 'h5',
	choices: [
		{ name: 'h5', value: 'h5' },
		{ name: 'voss', value: 'voss' },
	],
}

const processPath = process.cwd()
const homeDirPath = homedir()
class DeployCommand extends Command {
	async prepare() {
		//获取本地env文件服务器密码
		await this.getUserHomeServerPassword()

		// 生成参数
		let argumentsString = ''
		for (let key in this._argv[0]) {
			if (this._argv[0][key]) {
				argumentsString += `--${key} `
			}
		}
		console.log(argumentsString)

		//获取env文件信息
		await this.LoadLocalServerInfo()

		//选择服务器
		await this.selectDeployType()

		//检查是否存在build指令并运行
		await this.checkNpmBuildCommand()

		//执行指令
		await this.execCode(this.code, argumentsString)
	}
	async checkPathExist(path) {
		return await fse.pathExists(path)
	}
	async checkNpmBuildCommand() {
		const pkgPath = path.resolve(processPath, 'package.json')

		if (!(await this.checkPathExist(pkgPath))) {
			throw new Error(`${processPath}:package.json文件不存在`)
		}

		const pkg = require(pkgPath)

		if (pkg.scripts && !pkg.scripts['build']) {
			throw new Error(`请在package.json中手动添加build指令`)
		}

		// 打包文件
		try {
			await exec('npm', ['run', 'build'], {
				cwd: processPath,
				stdio: 'inherit',
			})
		} catch (error) {
			throw new Error(`打包失败,请检查代码后再次尝试打包～`)
		}
	}
	loadEnvFile(path) {
		return dotEnv.config({
			path,
		})
	}
	async LoadLocalServerInfo() {
		//获取本地服务器信息
		const { environment } = await inquirer.prompt(deployPromt)

		if (this.type == 'h5') {
			this.passward = this.userHomeInfo['SERVER_PASSWARD']
		} else {
			// prettier-ignore
			this.passward = environment === 'production' ? this.userHomeInfo['VOSS_PRO_PASSWARD'] : this.userHomeInfo['VOSS_DEV_PASSWARD']
		}

		if (!this.passward) {
			throw new Error(
				`请在${homeDirPath}创建.env文件配置服务器密码,字段名为${
					this.type == 'h5' ? 'SERVER_PASSWARD' : 'VOSS_PRO_PASSWARD | VOSS_DEV_PASSWARD'
				}`,
			)
		}

		const deployPath = path.resolve(pkgDir(__filename), 'node_modules', DEPLOY_NPM_PKG)
		this.environment = environment
		this.code = deployPath
		this.dotEnvPath = path.resolve(processPath, '.env')

		if (environment == 'production') {
			this.code += ' production'
			this.dotEnvPath = path.resolve(processPath, '.env.production')
		}

		if (!(await this.checkPathExist(this.dotEnvPath))) {
			throw new Error(`${this.dotEnvPath}不存在`)
		}
	}
	async selectDeployType() {
		const { parsed: localEnvInfo } = this.loadEnvFile(this.dotEnvPath)
		this.localEnvInfo = localEnvInfo
		const comfirmPromt = {
			name: 'deploy',
			message: `部署在服务器路径：${this.localEnvInfo.DEPLOY_PATH}`,
			default: true,
			type: 'list',
			choices: [
				{ name: '是', value: true },
				{ name: '否', value: false },
			],
		}
		const { deploy } = await inquirer.prompt(comfirmPromt)

		if (!deploy) {
			throw new Error('取消发布')
		}
	}
	async execCode(code, argumentsString) {
		exec(`echo ${this.passward} | node ${code} ${argumentsString} `, {
			cwd: processPath,
			stdio: 'inherit',
			shell: true,
		}).then((res) => {
			if (res === 0) {
				log.notice('浏览器地址:', this.localEnvInfo.URL)
			}
		})
	}
	async getUserHomeServerPassword() {
		const { type } = await inquirer.prompt(deployTypePromt)

		this.type = type

		const userHomeDevFilePath = path.resolve(homeDirPath, '.env')

		const { parsed: userHomeInfo } = this.loadEnvFile(userHomeDevFilePath)

		this.userHomeInfo = userHomeInfo
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
