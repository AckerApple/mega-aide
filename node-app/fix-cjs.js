import fs from 'fs'
import path from 'path'

console.debug('📕 Reading index.cjs...')
const fullPath = path.resolve('index.cjs')
const content = fs.readFileSync(fullPath).toString()
const newContent = content.replace(/var __dirname([^=]*)=(.+)/g,'var __dirname$1 = __dirname // $2')
fs.writeFileSync(fullPath, newContent)
console.debug('✅ ✍️ Rewrote index.cjs')