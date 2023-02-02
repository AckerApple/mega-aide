const fs = require('fs')
const path = require('path')

const indexFilePath = path.join(__dirname, '../', 'gh-pages', 'index.html')
let indexHtml = fs.readFileSync( indexFilePath ).toString()

indexHtml = indexHtml.replace('<base href="/">', '<base href="/mega-aide/">')

fs.writeFileSync(indexFilePath, indexHtml)

console.log('updated gh-pages build', indexFilePath)