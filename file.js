const path = require('path');
const fs = require('fs');


function _initFilePath(fileName){
    return path.join(process.cwd(),fileName)
}

function readFileSync(fileName){
    return fs.readFileSync(_initFilePath(fileName),'utf-8');
}
function existsSync(fileName){
    
    return fs.existsSync(_initFilePath(fileName))
}
function writeAsync(fileName,file){
    return fs.writeFileSync(_initFilePath(fileName),file)
}

module.exports = {
    readFileSync,
    existsSync,
    writeAsync
}