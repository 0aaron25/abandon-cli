const { TYPE_PROJECT, TYPE_COMPONENT } = require("./const")
//用户选择项目交户的Promt
const title = process.env.PROJECT_TYPE === TYPE_PROJECT ? "项目" : "组件"
const projectNamePrompt = {
	name: "projectName",
	type: "input",
	message: `请输入${title}的名字`,
	default: "",
	validate: function (value) {
		return typeof value === "string"
	},
}
const projectVersionPromt = {
	type: "input",
	name: "projectVersion",
	message: `请输入${title}的版本号:`,
	validate: function (value) {
		return typeof value === "string"
	},
}

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

module.exports = {
	projectVersionPromt,
	projectNamePrompt,
	projectTypePromt,
}
