"use strict"

const semver = require("semver")

/**
 *
 * @param {*} 获取包信息
 * @returns
 */
function getNpmInfo(pkgName, registry) {
	const urljoin = require("url-join")
	const axios = require("axios").default
	if (!pkgName) {
		return null
	}
	const registryUrl = registry || getDefaultRegistry()
	const npmInfoUrl = urljoin(registryUrl, pkgName)
	return axios
		.get(npmInfoUrl)
		.then(response => {
			if (response.status === 200) {
				return response.data
			}
			return null
		})
		.catch(err => {
			return Promise.reject(err)
		})
}

//获取默认npm源
function getDefaultRegistry(isOriginal = false) {
	return isOriginal
		? "https://registry.npmjs.org"
		: "https://registry.npm.taobao.org"
}

async function getNpmVersions(pkgName, registry = getDefaultRegistry()) {
	const data = await getNpmInfo(pkgName, registry)
	if (data) {
		return Object.keys(data.versions)
	} else {
		return []
	}
}

function getSemverVersions(baseVersion, versions) {
	return versions
		.filter(version => semver.satisfies(version, `^${baseVersion}`))
		.sort((a, b) => (semver.gt(b, a) ? 1 : -1))
}

async function getNpmSemverVersion(baseVersion, pkgName, registry) {
	const versions = await getNpmVersions(pkgName, registry)
	const newVersion = getSemverVersions(baseVersion, versions)
	if (newVersion && newVersion.length > 0) {
		return newVersion[0]
	}
	return null
}

async function getNpmLatestVersion(pkgName, registry) {
	const versions = await getNpmVersions(pkgName, registry)
	return versions.sort((a, b) => (semver.gt(b, a) ? 1 : -1))[0]
}

module.exports = {
	getNpmInfo,
	getNpmVersions,
	getDefaultRegistry,
	getSemverVersions,
	getNpmSemverVersion,
	getNpmLatestVersion,
}
