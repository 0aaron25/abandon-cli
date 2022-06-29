"use strict"
const path = require("path")
const pkgDir = require("pkg-dir").sync
const npminstall = require("npminstall")
const { isObject } = require("@abandon-cli/utils")
const formatPath = require("@abandon-cli/format-path")
const pathExists = require("path-exists").sync
const {
	getNpmLatestVersion,
	getDefaultRegistry,
} = require("@abandon-cli/get-npm-info")

class Package {
	// TODO
	constructor(options) {
		if (!isObject(options)) throw new Error("options必须是一个对象")
		if (Object.keys(options).length == 0) throw new Error("options不能为空")
		// package的目标路径
		this.targetPath = options.targetPath
		// 缓存package的路径
		this.storeDir = options.storeDir
		// package的name
		this.packageName = options.packageName
		// package的version
		this.packageVersion = options.packageVersion
	}
	get cacheFilePath() {
		const cacheFilePathPrefix = this.packageName.replace(/\//g, "_")
		const cacheFilePathPostfix = this.packageName.split("/")[0]
		const cacheFile = `_${cacheFilePathPrefix}@${this.packageVersion}@${cacheFilePathPostfix}`
		return path.resolve(this.storeDir, cacheFile)
	}

	async exists() {
		if (this.storeDir) {
			await this.prepare()
			console.log(this.cacheFilePath)
			console.log(pathExists(this.cacheFilePath))
			return pathExists(this.cacheFilePath)
		} else {
			return pathExists(this.targetPath)
		}
	}
	update() {}
	async prepare() {
		//1.获取最新版本号
		if (this.packageVersion === "latest") {
			this.packageVersion = await getNpmLatestVersion(this.packageName)
		}
		//2.
	}
	async install() {
		await this.prepare()
		return npminstall({
			root: this.targetPath,
			storeDir: this.storeDir,
			registry: getDefaultRegistry(),
			pkgs: [{ name: this.packageName, version: this.packageVersion }],
		})
	}
	getRootFilePath() {
		//1.先获取package.json的所在目录
		const dir = pkgDir(this.targetPath)
		if (dir) {
			//2.读取package.json
			const pkgPath = path.resolve(dir, "package.json")
			const pkgFile = require(pkgPath)
			//3.获取package.json的lib或者main
			if (pkgFile && pkgFile.main) {
				//4.路径兼容macos和window
				return formatPath(path.resolve(dir, pkgFile.main))
			}
		}
		return null
	}
}

module.exports = Package
