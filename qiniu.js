const qiniu = require('qiniu');
const fs = require('fs');

var accessKey = '0uEh2m5bU2z61I0Zw4eK6zRxil0dUCB9Wp3eEY0x';
var secretKey = '9pntPsun_6YtkY-4cZdBfdSBe-_2MO_hfZ4dFyqr';
var config = new qiniu.conf.Config();
config.zone = qiniu.zone.Zone_z2;
var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);



async function uploadImg(name, path) {
    var options = {
        scope: 'yamaxun'
    }
    var putPolicy = new qiniu.rs.PutPolicy(options);
    var uploadToken = putPolicy.uploadToken(mac);
    var putExtra = new qiniu.form_up.PutExtra();
    var formUploader = new qiniu.form_up.FormUploader(config)
    return new Promise((reslove, reject) => {
        formUploader.putFile(uploadToken, name, path, putExtra, function(respErr,
            respBody, respInfo) {
            if (respErr) {
                reject(respErr);
            }
            if (respInfo.statusCode == 200) {
                reslove()
            } else {
                reject(respInfo)
            }
        })
    })

}

module.exports = {
    uploadImg
}