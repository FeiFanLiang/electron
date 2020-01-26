const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const {uploadImg} = require('./qiniu');

const fs = require('fs');
let browser = null;
const crypto = require('crypto');
const appKey = '485a6072d1f16ebe';
const key = 'w1hN1Fo24dJYn1ftuXIT0ByEElCkkaUW'; //注意：暴露appSecret，有被盗用造成损失的风险
async function getTrans(query, country) {
	const {
		ctx
	} = this;
	const salt = (new Date).getTime()
	const str1 = appKey + query + salt + key;
	let md5 = crypto.createHash('md5');
	let sign = md5.update(str1).digest('hex')
	let to = this.getTranslateTo(country)

	const res = await ctx.curl('http://openapi.youdao.com/api', {
		method: 'POST',
		data: {
			q: query,
			appKey: appKey,
			salt: salt,
			from: 'zh-CHS',
			to: to,
			sign: sign
		},
		contentType: 'json',
		dataType: 'json'
	})
	res
}
function getTranslateTo(country) {
	if (country == 'uk') {
		return 'en'
	}
	if (country == 'fr') {
		return 'fr'
	}
	if (country == 'de') {
		return 'de'
	}
	if (country == 'it') {
		return 'it'
	}
	if (country == 'es') {
		return 'es'
	}

}
;(
	async () => {
			const salt = (new Date).getTime()
			const str1 = appKey + '查到的' + salt + key;
			let md5 = crypto.createHash('md5');
			let sign = md5.update(str1).digest('hex')
			
		const option = {
			method: 'get',
			url: 'http://openapi.youdao.com/api',
				params: {
					q: '查到的',
					appKey: appKey,
					salt: salt,
					from: 'auto',
					to: 'de',
					sign: sign
				},
		}
		const res = await axios(option)
		res
	}
)()
