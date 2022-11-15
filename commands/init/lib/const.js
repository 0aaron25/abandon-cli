/**
 * 	选择的类型
 */
const TYPE_PROJECT = "project"
const TYPE_COMPONENT = "component"

/**
 * 	默认模版的类型
 */
const DEFAULT_TEMPLATE_TYPE = "normal"

/**
 * 	文件清空的白名单
 */
const WHITE_LIST_FILE = ["node_modules", ".git"]

/**
 * 	命令合法白名单
 */
const WHITE_LIST_COMMAND = ["npm"]

/**
 * 	token失效时间
 */
const TOKEN_EXPIRE_TIME = 24 * 60 * 60 * 1000

module.exports = {
	TYPE_PROJECT,
	TYPE_COMPONENT,
	DEFAULT_TEMPLATE_TYPE,
	WHITE_LIST_FILE,
	WHITE_LIST_COMMAND,
	TOKEN_EXPIRE_TIME,
}
