"use strict";
const SUCCESS_CODE = 0;
const axios = require("axios");
const log = require("@abandon-cli/log");
const BASE_URL = process.env.ABANDON_CLI_BASE_URL
	? process.env.ABANDON_CLI_BASE_URL
	: "http://test.ls.xiaoai.live/voss";

const axiosInstance = axios.create({
	baseURL: BASE_URL,
	timeout: 5000,
});

axiosInstance.interceptors.response.use(
	(res) => {
		const { code, msg } = res.data;
		log.verbose("code", code);
		log.verbose("msg", msg);
		if (code !== SUCCESS_CODE) {
			throw new Error(msg);
		}
		return res.data;
	},
	(error) => {
		throw new Error(error);
	}
);

module.exports = axiosInstance;
