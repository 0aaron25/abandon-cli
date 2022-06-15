#! /usr/bin/env node

const importLocal = require("import-local")

if (importLocal(__filename)) {
	console.log(1111)
	require("npmlog").info("cli", "abandon-cli正在使用本地版本")
} else {
	require("../lib")(process.argv.slice(2))
}
