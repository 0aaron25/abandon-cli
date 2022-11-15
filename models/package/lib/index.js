"use strict"
const path = require("path")
const npminstall = require("npminstall")
const { isObject } = require("@abandon-cli/utils")
const formatPath = require("@abandon-cli/format-path")
const fse = require("fs-extra")
const semver = require("semver")
const pkgDir = require("pkg-dir").sync
const pathExists = require("path-exists").sync
const {
	getNpmLatestVersion,
	getDefaultRegistry,
} = require("@abandon-cli/get-npm-info")

/**
 * 通用包类
 */
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
		const cacheFile = `_${cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
		return path.resolve(this.storeDir, cacheFile)
	}
	specifyCachePath(pkgVersion) {
		const cacheFilePathPrefix = this.packageName.replace(/\//g, "_")
		const cacheFile = `_${cacheFilePathPrefix}@${pkgVersion}@${this.packageName}`
		return path.resolve(this.storeDir, cacheFile)
	}

	async exists() {
		if (this.storeDir) {
			await this.prepare()
			return pathExists(this.cacheFilePath)
		} else {
			return pathExists(this.targetPath)
		}
	}
	async update() {
		await this.prepare()
		//1.获取最新版本号
		const lastestVersion = await getNpmLatestVersion(this.packageName)

		if (semver.lte(this.packageVersion, lastestVersion)) {
			this.packageVersion = lastestVersion
		}

		//2.获取最新版本号缓存路径
		const lastestCacheFile = this.specifyCachePath(lastestVersion)
		//3.判断最新版本好缓存路径是否存在，如果不存在就下载
		if (lastestCacheFile && !pathExists(lastestCacheFile)) {
			await npminstall({
				root: this.targetPath,
				storeDir: this.storeDir,
				registry: getDefaultRegistry(),
				pkgs: [{ name: this.packageName, version: lastestVersion }],
			})
		}
	}
	async prepare() {
		//1.获取最新版本号
		if (this.packageVersion === "latest") {
			this.packageVersion = await getNpmLatestVersion(this.packageName)
		}
		//2.生成缓存路径
		if (this.storeDir && !pathExists(this.storeDir)) {
			fse.mkdirpSync(this.storeDir)
		}
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
		function _getRootFile(targetPath) {
			//1.先获取package.json的所在目录
			const dir = pkgDir(targetPath)

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
		}
		if (this.storeDir) {
			return _getRootFile(this.cacheFilePath)
		} else {
			return _getRootFile(this.targetPath)
		}
	}
}

module.exports = Package
