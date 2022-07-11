const http = require('http')
const path = require('path')
const fse = require('fs-extra')
const multiparty = require('multiparty')

const server = http.createServer()

/// 提取后缀名
const extractExt = filename => filename.slice(filename.lastIndexOf('.'), filename.length)

/// 大文件存储目录
const UPLOAD_DIR = path.resolve(__dirname, '..', 'target')

const resolvePost = req => {
  return new Promise(resolve => {
    let chunk = ''
    req.on('data', data => {
      chunk += data
    })
    req.on('end', () => {
      resolve(JSON.parse(chunk))
    })
  })
}

/// 写入文件流
const pipeStream = (path, writeStream) => {
  return new Promise(resolve => {
    const readStream = fse.createReadStream(path)
    readStream.on('end', () => {
      fse.unlinkSync(path)
      resolve()
    })
    readStream.pipe(writeStream)
  })
}

/// 合并切片
const mergeFileChunk = async (filePath, filename, size) => {
  const chunkDir = path.resolve(UPLOAD_DIR, 'chunk_' + filename)
  const chunkPaths = await fse.readdir(chunkDir)
  // console.log('chunkDir: ', chunkDir)
  // console.log('chunkPaths: ', chunkPaths)

  chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1])

  /// 并发写入文件
  await Promise.all(chunkPaths.map((chunkPath, index) => {
    return pipeStream(
      path.resolve(chunkDir, chunkPath),
      fse.createWriteStream(filePath, {
        start: index * size
      })
    )
  }))

  fse.rmdirSync(chunkDir)
}

server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') {
    res.status = 200
    res.end()
    return
  }

  if (req.url === '/verify') {
    const data = await resolvePost(req)
    const { filename, hash } = data
    const filePath = path.resolve(UPLOAD_DIR, `${hash}_${filename}`)
    // console.log('filePath: ', filePath)
    if (fse.existsSync(filePath)) {
      res.end(JSON.stringify({ shouldUpload: false }))
    } else {
      res.end(JSON.stringify({ shouldUpload: true }))
    }
  }

  if (req.url === '/merge') {
    const data = await resolvePost(req)
    const { filename, size, hash } = data
    const filePath = path.resolve(UPLOAD_DIR, `${hash}_${filename}`)
    await mergeFileChunk(filePath, filename, size)
    res.end(
      JSON.stringify({
        code: 0,
        message: 'file merged success'
      })
    )
  }

  if (req.url === '/') {
    const multipart = new multiparty.Form()
    multipart.parse(req, async (err, fields, files) => {
      if (err) return
      const [chunk] = files.chunk
      const [hash] = fields.hash
      const [filename] = fields.filename

      const chunkDir = path.resolve(UPLOAD_DIR, 'chunk_' + filename)
      /// 如果没有文件夹，创建一个
      if (!fse.existsSync(chunkDir)) {
        await fse.mkdirs(chunkDir)
      }

      await fse.move(chunk.path, `${chunkDir}/${hash}`)
      res.end('received file chunk')
    })
  }
})

server.listen(3000, () => {
  console.log('启动啦')
})
