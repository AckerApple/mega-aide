const fs = require('fs')
const path = require('path')

const indexFilePath = path.join(__dirname, 'resources', 'webapp', 'index.html')
let contents= fs.readFileSync(indexFilePath).toString()

const scripts = [
  '<script src="neutralino/neutralino.js"></script>',
  '<script src="neutralino/main.js"></script>'
]
scripts.forEach(script => contents = contents.replace('\n'+script, '')) // remove if already defined
const addContent = `\n${scripts[0]}\n${scripts[1]}</head>`
contents = contents.replace('</head>', addContent)

fs.writeFileSync(indexFilePath, contents)

console.log('✅ injected neutralino into webapp')