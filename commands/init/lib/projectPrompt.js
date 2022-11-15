const { TYPE_PROJECT, TYPE_COMPONENT } = require("./const")
const semver = require("semver")
const validate = require("validate-npm-package-name")
//用户选择项目交户的Promt
const title = process.env.PROJECT_TYPE === TYPE_PROJECT ? "项目" : "组件"

/**
 * @description 项目名称交互
 */
const projectNamePrompt = {
	name: "projectName",
	type: "input",
	message: `请输入${title}的名字`,
	default: "my-project",
	validate: function (value) {
		const done = this.async()

		// Do async stuff
		setTimeout(function () {
			if (!validate(value).validForNewPackages) {
				// Pass the return value in the done callback
				done(`请输入正确的${title}名,可参考npm包规则`)
				return
			}
			// Pass the return value in the done callback
			done(null, true)
		}, 0)
	},
}

function validateFileName(fileName) {
	//var fileName = 'a.html';
	var reg = new RegExp('[\\\\/:*?"<>|]')
	if (reg.test(fileName) || fileName.length == 0) {
		//"上传的文件名不能包含【\\\\/:*?\"<>|】这些非法字符,请修改后重新上传!";
		return false
	}
	return true
}
/**
 * @description 部署名称交互
 */
const projectDeployNamePrompt = {
	name: "deployDirName",
	type: "input",
	message: "请输入项目部署文件夹名字:",
	validate: function (value) {
		const done = this.async()

		setTimeout(function () {
			if (!validateFileName(value)) {
				done(`请输入正确的项目部署文件夹名`)
				return
			}
			// Pass the return value in the done callback
			done(null, true)
		}, 0)
	},
}

/**
 * @description 项目版本交互
 */
const projectVersionPromt = {
	type: "input",
	name: "projectVersion",
	message: `请输入${title}的版本号:`,
	default: "1.0.0",
	validate: function (value) {
		const done = this.async()

		// Do async stuff
		setTimeout(function () {
			if (!!!semver.valid(value)) {
				// Pass the return value in the done callback
				done(`请输入正确的版本号,eg:1.0.0`)
				return
			}
			// Pass the return value in the done callback
			done(null, true)
		}, 0)
	},
	filter: function (value) {
		if (!!semver.valid(value)) {
			return semver.valid(value)
		} else {
			return value
		}
	},
}
/**
 * @description 项目类型校验
 */
const projectTypePromt = {
	name: "type",
	message: "请选择初始化类型",
	type: "list",
	default: TYPE_PROJECT,
	choices: [
		{ name: "项目", value: TYPE_PROJECT },
		{ name: "组件", value: TYPE_COMPONENT },
	],
}

/**
 * @description 项目模版选择
 */
const projectChoicePromt = {
	name: "projectTemplate",
	message: "请选择项目模版",
	type: "list",
}

/**
 * @description 登陆 用户名
 */
const projectLoginUserNamePromt = {
	name: "username",
	message: "请输入voss用户名:",
	type: "input",
	validate: function (value) {
		const done = this.async()

		setTimeout(function () {
			if (!value) {
				done(`用户名不能为空`)
				return
			}
			done(null, true)
		}, 0)
	},
}
/**
 * @description 登陆 密码
 */
const projectLoginPasswordPromt = {
	name: "password",
	message: "请输入密码:",
	type: "password",
	mask: "*",
	validate: function (value) {
		const done = this.async()

		setTimeout(function () {
			if (!value) {
				done(`密码不能为空`)
				return
			}
			done(null, true)
		}, 0)
	},
}
/**
 * @description 登陆 密码
 */
const projectLoginCodePromt = {
	name: "code",
	message: "请输入验证码:",
	type: "input",
	validate: function (value) {
		const done = this.async()

		setTimeout(function () {
			if (!value) {
				done(`验证码不能为空`)
				return
			}
			done(null, true)
		}, 0)
	},
}

module.exports = {
	projectVersionPromt,
	projectNamePrompt,
	projectTypePromt,
	projectChoicePromt,
	projectDeployNamePrompt,
	projectLoginUserNamePromt,
	projectLoginPasswordPromt,
	projectLoginCodePromt,
}
