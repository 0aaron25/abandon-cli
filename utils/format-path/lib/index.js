"use strict"

const path = require("path")

function formatPath(originalPath) {
	if (!originalPath) throw new Error("传入的路径不能为空")
	const sep = path.sep
	if (sep === "/") {
		return originalPath
	} else {
		return originalPath.replace(/\\/g, "/")
	}
}
module.exports = formatPath
