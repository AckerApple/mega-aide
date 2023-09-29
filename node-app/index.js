import express from 'express'
import open from 'open'
import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
// const express = require('express')
// const openImport = import('open') // limitation of pkg for ESM packages

async function start() {
  // const open = (await openImport).default
  const app = express()
  const PORT = 8080
  const publicPath = path.join(__dirname, 'public') // process.cwd() // __dirname
  console.log('publicPath', publicPath)
  fs.readdir(publicPath, (err, files) => {
    console.log('files', files)
  })

  app.use(express.static(publicPath))
  
  console.log('⏳ Starting server ...')
  app.listen(PORT, async () => {
    console.log(`✅ Started server on port ${PORT}`)
    
    const url = 'http://localhost:8080/'
    console.log(`🌎 Opening web page ${url}`)
    open(url)
  })
}

start()