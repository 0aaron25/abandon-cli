"use strict"

const axios = require("axios")

const BASE_URL = process.env.ABANDON_CLI_BASE_URL
	? process.env.ABANDON_CLI_BASE_URL
	: "http://test.ls.xiaoai.live/voss"

const axiosInstance = axios.create({
	baseURL: BASE_URL,
	timeout: 5000,
})

axiosInstance.interceptors.response.use(
	res => {
		return res.data
	},
	error => {
		return Promise.reject(error)
	}
)

module.exports = axiosInstance
