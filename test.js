import { createServer } from 'http'
import { appendFile, readFile, writeFile } from 'fs'
import { resolve } from 'path'

function getListFilePath(list) {
  const safeList = (list || 'default').replace(/[^a-zA-Z0-9_-]/g, '')
  return `./textdata/${safeList}.txt`
}

const server = createServer((req, res) => {
  const method = req.method
  const url = req.url.split('?')[0]
  const params = new URL(req.url, `http://${req.headers.host}`).searchParams
  const list = params.get('list') || 'default'
  const fPath = getListFilePath(list)

  if (method === 'GET' && (url === '/' || url === '/index.html')) {
    readFile('./frontend/index.html', (err, data) => {
      if (err) {
        res.writeHead(500)
        res.end('Error reading index.html')
        return
      }
      res.writeHead(200, {'content-type':'text/html'})
      res.end(data)
    })      
    return
  }

  if (method === 'POST' && url === '/save') {
    (async () => {
      try {
        const bookToAdd = await getBookName(req)        
        const resMsg = await appendToFile(fPath, bookToAdd)
        res.writeHead(200, {'content-type':'text/plain'})
        res.end(resMsg)
      } catch (err) {
        res.writeHead(500, {'content-type':'text/plain'})
        res.end(err.message)
      }
    })()
    return
  }
  
  if (method === 'GET' && url === '/books') {
    (async () => {
      try {
        const latestBookList = await readFromFile(fPath)
        res.writeHead(200, {'content-type':'text/plain'})
        res.end(latestBookList.join('\n'))
      } catch {
        res.writeHead(500)
        res.end('Error reading from file')
      }
    })()
    return
  }

  if (method === 'DELETE' && url === '/delete') {
    (async () => {
      try {
        const bookToDelete = await getBookName(req)
        const currentBooks = await readFromFile(fPath)
        const updatedBooks = currentBooks.filter(book => book !== bookToDelete && book !== '')
        await writeToFile(fPath, updatedBooks)
        res.writeHead(200)
        res.end('Book deleted')
      } catch {
        res.writeHead(500)
        res.end('Error on delete')
      }
    })()
    return
  }

  if (method === 'DELETE' && url === '/clear') {
    try {
      writeToFile(fPath, [""])
      res.writeHead(200)
      res.end("List cleared")
    } catch {
      res.writeHead(500)
      res.end("Error on clear")
    }
    return
  }
  
  if (method === 'PUT' && url === '/edit') {
    let body = ''
    try {
      req.on('data', chn => {body += chn})
      req.on('end', async () => {
        const {oldName, newName} = JSON.parse(body)
        const currentBooks = await readFromFile(fPath)
        const newBooks = currentBooks.map(bk => bk === oldName ? newName : bk)
        writeToFile(fPath, newBooks)
        res.writeHead(200)
        res.end("Book saved")
      })
    } catch {
      res.writeHead(500)
      res.end("Error on update")
    }
    return
  }

  // Serve static files from frontend folder (images, css, js, etc.)
  if (method === 'GET' && url.match(/^\/(?!books|save|delete|$)[^?]*\.[a-zA-Z0-9]+/)) {
    const filePath = `./frontend${url}`;
    const ext = url.split('.').pop().toLowerCase();
    const mimeTypes = {
      'svg': 'image/svg+xml',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'ico': 'image/x-icon',
      'css': 'text/css',
      'js': 'text/javascript',
      'json': 'application/json',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'eot': 'application/vnd.ms-fontobject',
      'otf': 'font/otf',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'html': 'text/html'
    };
    readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404)
        res.end('Not found')
        return
      }
      res.writeHead(200, {'content-type': mimeTypes[ext] || 'application/octet-stream'})
      res.end(data)
    })
    return
  }
})

async function getBookName(req) {
  let inBook = ""
  return new Promise((resolve, reject) => {
    req.on('data', (chunk)=>{
      inBook += chunk.toString()
    })
    req.on('end', ()=>{
      resolve(inBook.trim())
    })
    req.on('error', (err) => {
      reject(err)
    })
  })
}
async function readFromFile(fPath) {
  return new Promise((res, rej) => {
    readFile(fPath, 'utf-8', (err, data) => {
      if (err){
        res([]) // Return empty if file doesn't exist
        return
      }
      const books = data.split('\n')
      res(books)
    })
  }) 
}

async function appendToFile(fPath, book) {
  return new Promise((res, rej) => {
    appendFile(fPath, "\n" + book.trim(), (err, data) => {
      if (err){
        rej(new Error('Error on save'))
        return
      }
      res("Book Saved")
    })
  })
}

async function writeToFile(fPath, books) {
  return new Promise((res, rej) => {
    writeFile(fPath, books.join("\n"), (err, data) => {
      if (err){
        rej(err)
        return
      }
      res('File updated')
    })
  })
}

server.listen(3000, () => {
  console.log("listening 3000")
})