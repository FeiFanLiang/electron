// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
window.$ = window.jQuery = require('jquery');
const axios = require('axios');
const path = require('path');
const puppeteer = require('puppeteer-core');
const cheerio = require('cheerio');
const request = require('request');
const jimp = require('jimp')
const {
    uploadImg
} = require('./qiniu');
const {
    readFileSync,
    existsSync,
    writeAsync
} = require('./file');
const fs = require('fs');

let browser = null;
let page = null;
let filterKeywordArray;

function sendMsgToMain(msg){
    new Notification('亚马逊通', {
        body:msg
      })
      
}

function getFilterFromFile(){
    let fileName = './屏蔽关键词.txt'
    let exists = existsSync(fileName);
    if(!exists){
        sendMsgToMain('请打开程序目录设置抓取过滤关键字')
        writeAsync(fileName,'')
        return []
    }else{
        let file = readFileSync(fileName)
        if(file.indexOf('\n') < -1 && file){
            return [file]
        }
        if(!file){
            return []
        }   
    }
}

function formatUserSpiderList(){
    let urlList = $('#urlList').val()
            urlList = urlList.split('\n').map(el => {
                return el.replace(/\s/g, '')
            })
            urlList = urlList.filter(el => el.indexOf('1688.com') !== -1)
            return urlList
}

function getChromePath(){
    let fileName = 'chrome.txt'
    let exists = existsSync(fileName)
    if(!exists){
        return null
    }
    return readFileSync(fileName)
}


;
(
    async () => {
        filterKeywordArray = getFilterFromFile()
        const username = require(path.join(process.cwd(), './u.json')).username
        $('title').append('&nbsp;&nbsp;当前用户名: ' + username)
        $('#btn').on('click', async function () {
           
            $(this).hide()
            let urlList = formatUserSpiderList()
            await spiderStart(username,urlList)
        })
    }
)()


async function initBrowser() {
    let ChromiumPath = getChromePath();
    if(!ChromiumPath){
        sendMsgToMain('请在程序目录下的chrome.txt添加您本地的chrome浏览器路径!')
        throw new Error()
    }
    browser = await puppeteer.launch({
        headless: false,
        defaultViewport: {
            width: 900,
            height: 900
        },
        args: ['--window-size=600,600'],
        executablePath: ChromiumPath,
        ignoreDefaultArgs: ["--enable-automation"]
    })
    page = await browser.newPage()
    const cookieExsits = fs.existsSync(path.join(process.cwd(), './cookies.json'))
    if (cookieExsits) {
        const cookie = require(path.join(process.cwd(), './cookies.json'))
        await page.setCookie(...cookie)
    }
    await page.goto('https://login.1688.com/member/signin.htm', {
        waitUntil: 'domcontentloaded'
    })
    sendMsgToMain('为避免爬取过程中出现验证，请先登录,等待时间1分钟')
    // await page.waitFor(60000)
    await page.waitFor(20000)
}

async function sleep(time) {
    return new Promise((reslove) => {
        setTimeout(() => {
            reslove()
        }, time);
    })
}

async function getMerchanUrlListFromPage(url){
    await page.goto(url,{
        waitUntil:'networkidle2',
        timeout:60000
    })
    await page.evaluate(() => {
        let height = document.body.scrollHeight
        window.scrollTo(0,height - 300);
    })
    await page.waitFor(5000)
    let list = await page.evaluate(() => {
        let list = [];
        let domList = document.querySelectorAll('.offer_item.offer_exp')
        if(domList.length){
            for(let dom of domList){
                let url = dom.querySelector('a').getAttribute('href')
                list.push(url)
            }
        }
        let otherDomList = document.querySelectorAll('.common-offer-card')
        if(otherDomList.length){
            for(let dom of otherDomList){
                let url = dom.querySelector('a').getAttribute('href')
                list.push(url)
            }
        }
        return list
    })
    return list
}

async function  spiderStart(username,urlList) {
    try {
        await initBrowser()
    let platform = $('#platSelect').val();
    if(platform == '1688_batch'){
        let spiderUrlList = []
        for(let url of urlList){
            let pageUrl = await getMerchanUrlListFromPage(url)
            spiderUrlList.push(...pageUrl)
        }
        urlList = spiderUrlList
        let textVal = '';
        urlList.forEach(el => {
            textVal+=`${el}\n`;
        })
        $('#urlList').val(textVal)
        $('#platSelect').val('1688_one')
    }
    for (let url of urlList) {
        let urlTextValue = $('#urlList').val()
        try {
            var data = await spiderMain(url)
        } catch (e) {
            console.log(e)
        }
        if (data) {
            sendMsgToMain('爬取成功')
            let params = Object.assign({},{username},data)
            axios.post('http://106.13.108.95:80/api/spiderUpload', params).then((res) => {
                let newVal = ''
                if (urlTextValue.indexOf(url + '\n') !== -1) {
                    newVal = urlTextValue.replace(url + '\n', '')
                } else {
                    newVal = urlTextValue.replace(url, '')
                }
                $('#urlList').val(newVal)
                sendMsgToMain('服务器上传成功')
            }).catch((err) => {
                console.log(err)
            })
        }
        if (data !== 0) {
            await sleep(10000)
        }
        if (data == undefined) {
            sendMsgToMain(`采集失败`)
        }


    }
    await browser.close()
    } catch (e) {
        console.log(e)
        sendMsgToMain('采集结束');
        $('#btn').show()
    }
}

async function spiderMain(url) {
    try {
        const page = await browser.newPage()
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 2 * 60 * 1000
        })
        const pageUrl = await page.url()
        let titleEx = await page.evaluate(() => {
            if (document.querySelector('#mod-detail-title .d-title')) {
                return document.querySelector('#mod-detail-title .d-title').innerHTML
            } else {
                return null
            }
        })
        if (pageUrl.indexOf('https://login.1688.com') !== -1 || !titleEx) {
            sendMsgToMain('页面可能出现验证码 请尽快处理验证码 休眠30秒后继续爬取',new Date().toLocaleString());
            await sleep(30000)
            return 0
        }
        const dialog = await page.$('.sufei-dialog')
        if (dialog) {
            //存在登录浮层
            await page.evaluate(() => {
                document.querySelector('#sufei-dialog-close').click()
            })
        }
        const cookies = await page.cookies()
        writeAsync('./cookies.json',JSON.stringify(cookies))
        const content = await page.content()
        const $ = cheerio.load(content, {
            decodeEntities: false
        })
        //产品标题
        let title = $('#mod-detail-title .d-title').text().replace(/\s/g, '').replace(/[`~!@#$%^&*()_\-+=<>?:"{}|,.\/;'\\[\]·~！@#￥%……&*（）——\-+={}|《》？：“”【】、；‘’，。、]/g, '')
        for (let text of filterKeywordArray) {
            if (title.indexOf(text) !== -1) {
                title = title.replace(text, '')
            }
        }
        const savePath = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}/${title}`
        mkdirSync(savePath)
        const currentPath = path.join(process.cwd(), savePath)
        //主产品价格
        const price = Number($('.d-content .price-now').text()) * 100
        //主图片
        let mainImgListUrl = []
        $('#dt-tab ul .tab-trigger').each(function (index, el) {
            let originURL = $(this).attr('data-imgs')
            if (originURL) {
                const url = JSON.parse(originURL).original
                //取前五张图片
                if (mainImgListUrl.length == 8) {
                    return
                }
                mainImgListUrl.push(url)
            }
        })
        const childList = await page.evaluate(() => {
            let childArrList = []
            let mainSku = document.querySelectorAll('ul.list-leading li')
            if (mainSku.length) {
                document.querySelectorAll('ul.list-leading li').forEach(el => {
                    let div = el.querySelector('div')
                    el.querySelector('a').click()
                    document.querySelectorAll('.table-sku tr').forEach(i => {
                        let obj = {}
                        obj.colorMap = JSON.parse(div.getAttribute('data-unit-config')).name
                        let dataImgs = JSON.parse(div.getAttribute('data-imgs'))
                        if (dataImgs !== null) {
                            obj.imgurl = JSON.parse(div.getAttribute('data-imgs')).original
                        } else {
                            obj.imgurl = ''
                        }

                        obj.sizeMap = JSON.parse(i.getAttribute('data-sku-config')).skuName
                        obj.childPrice = Number(i.querySelector('.price .value').innerHTML) * 100
                        obj.childMerchanNumber = Number(i.querySelector('.count .value').innerHTML)
                        childArrList.push(obj)
                    })
                })
            } else {
                document.querySelectorAll('.table-sku tr').forEach(i => {

                    let obj = {}
                    const childImg = i.querySelector('.image')
                    if (childImg) {
                        obj.imgurl = JSON.parse(i.querySelector('.image').getAttribute('data-imgs')).original
                    } else {
                        obj.imgurl = ''
                    }

                    obj.colorMap = JSON.parse(i.getAttribute('data-sku-config')).skuName
                    obj.childPrice = Number(i.querySelector('.price .value').innerHTML) * 100
                    obj.childMerchanNumber = Number(i.querySelector('.count .value').innerHTML)
                    childArrList.push(obj)
                })
            }

            return childArrList
        })
        let downLoadOptions = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                'Accept-Encoding': 'gzip, deflate, br'
            },
            gzip: true,
            timeout: 8000,
            encoding: null
        }
        if (mainImgListUrl.length > 0) {
            const promiseArr = mainImgListUrl.map((el, index) => {
                return new Promise((reslove, reject) => {
                    let options = Object.assign({}, downLoadOptions)
                    options.url = el
                    const downLoadPath = `${currentPath}\\main${index}.jpeg`
                    let writeStream = fs.createWriteStream(downLoadPath)
                    let readStream = request(options)
                    readStream.pipe(writeStream)
                    readStream.on('error', (err) => {
                        reject(err)
                    })
                    readStream.on('end', async function (res) {
                        const name = Math.floor(Math.random() * 1000) + (+new Date())
                        const bg = await jimp.read(path.join(process.cwd(), 'bg.jpg'))
                        bg.resize(850, 850)
                        const img = await jimp.read(downLoadPath)
                        img.contain(800, 800)
                        bg.blit(img, 25, 25, async () => {
                            await bg.writeAsync(downLoadPath)
                            uploadImg(name, downLoadPath).then(() => {
                                reslove(`http://y.amazonvvip.com/${name}?imageMogr2/auto-orient/thumbnail/1050x1050!/blur/1x0/quality/75|imageslim`)
                            }).catch((err) => {
                                reject(err)
                            })
                        })
                    })
                })
            })
            const list = await Promise.all(promiseArr)
            mainImgListUrl = list
        }

        if (childList.length > 0) {
            let currentArr = []
            childList.forEach(el => {
                let f = currentArr.find(tar => tar.colorMap == el.colorMap)
                if (!f) {
                    currentArr.push(el)
                    currentArr = currentArr.filter(el => el.imgurl !== '')
                }
            })
            const promiseArr = currentArr.map(el => {
                return new Promise((reslove, reject) => {
                    let options = Object.assign({}, downLoadOptions)
                    options.url = el.imgurl
                    const downLoadPath = `${currentPath}/${el.colorMap.replace(/[`~!@#$%^&*()_\-+=<>?:"{}|,.\/;'\\[\]·~！@#￥%……&*（）——\-+={}|《》？：“”【】、；‘’，。、]/g, '')}.jpeg`
                    let writeStream = fs.createWriteStream(downLoadPath)
                    let readStream = request(options)
                    readStream.pipe(writeStream)
                    readStream.on('error', (err) => {
                        reject(err)
                    })
                    readStream.on('end', async function (res) {
                        const name = Math.floor(Math.random() * 1000) + (+new Date())
                        const bg = await jimp.read(path.join(process.cwd(), 'bg.jpg'))
                        bg.resize(850, 850)
                        const img = await jimp.read(downLoadPath)
                        img.contain(800, 800)
                        bg.blit(img, 25, 25, async () => {
                            await bg.writeAsync(downLoadPath)
                            uploadImg(name, downLoadPath).then(() => {
                                childList.forEach(t => {
                                    if (t.colorMap == el.colorMap) {
                                        t.imgurl = `http://y.amazonvvip.com/${name}?imageMogr2/auto-orient/thumbnail/1050x1050!/blur/1x0/quality/75|imageslim`
                                    }
                                });
                             reslove()
                            }).catch((err) => {
                                reject(err)
                            })
                        })
                    })
                })
            })
            await Promise.all(promiseArr)
        }
        let disText = ''
        const tds = $('#mod-detail-attributes .obj-content tr td')
        for (let i = 0, l = tds.length; i < l; i += 2) {
            if ($(tds[i]).text()) {
                let text = $(tds[i]).text() + ':' + $(tds[i + 1]).text() + ','
                let r = filterKeywordArray.find(el => text.indexOf(el) !== -1)
                if (!r) {
                    disText += text
                }
            }

        }
        let newMerChan = {
            merchanName: title,
            price: price,
            description: disText,
            children: childList,
            originUrl: url,
            platForm:'1688'
        }
        let mainImgList = []
        for(let i=1;i<9;i++) {
            let obj = {
                index:i,
                imgUrl:mainImgListUrl[i] || ''
            }
            mainImgList.push(obj);
        }
        newMerChan.mainImgList = mainImgList;
        newMerChan.children.forEach((el,index) => {
            el.childImgList = []
            el.childImgList.push({
                index:1,
                imgUrl:el.imgurl
            })
            for(let i=2,l=9;i<l;i++){
                let obj = {
                    index:i,
                    imgUrl:mainImgListUrl[i] || ''
                }
                el.childImgList.push(obj)
            }
            delete el.imgurl
        })
        await page.close()
        return newMerChan
    }
    catch (e) {
        await page.close()
        console.log(e)
    }
}
//创建本地目录保存下载图片
function mkdirSync(savePath) {
    if (fs.existsSync(savePath)) {
        return true;
    } else {
        if (mkdirSync(path.dirname(savePath))) {
            fs.mkdirSync(savePath);
            return true;
        }
    }
}