window.$ = window.jQuery = require('jquery');
const axios = require('axios');
const path = require('path');
const fs =require('fs');
;(
    async () => {
        $('#login').on('click',async function (){
            const username = $('#username').val().trim()
            const password = $('#password').val().trim()
            if(!username || !password){
                alert('请输入账号密码！')
                return
            }
            const params = {
                username,
                password
            }
            axios.post('http://106.13.108.95:80/api/spiderLogin',params).then((res) => {
                if(res.data.err){
                    alert('用户名或密码错误!')
                    return
                }
                const userInfo = {
                    username:username
                }
                fs.writeFileSync(path.join(process.cwd(),'u.json'),JSON.stringify(userInfo))
                const ipcRenderer = require('electron').ipcRenderer;
                ipcRenderer.sendSync('login',true)
            }).catch((err) => {
                alert('网络异常,登录失败！')
            })
            
        })
    }
)()
