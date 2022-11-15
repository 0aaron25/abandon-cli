const request = require("@abandon-cli/request")
const md5 = require("md5")
class API {
	static getProjectTemplate(token, uid) {
		return request({
			url: "/v1/voss/config/get_conf",
			method: "post",
			data: {
				data: {
					key: "abandon_cli_config",
					version: 1,
				},
				uid,
				token,
			},
		})
	}
	static Login(data) {
		const { username, code, password } = data
		return request({
			url: "/v1/voss/login",
			method: "post",
			data: {
				data: { username, password: md5(password), code, version: 1 },
				uid: "",
				token: 0,
			},
		})
	}
}

module.exports = API
