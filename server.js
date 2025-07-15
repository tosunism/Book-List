import 'dotenv/config'
import { createServer, get } from 'http'
import { appendFile, existsSync, readFile, writeFile } from 'fs'
import { resolve } from 'path'
import db from './db.js'


const server = createServer((req, res) => {
  const method = req.method
  const url = req.url
  const params = new URL(req.url, `http://${req.headers.host}`).searchParams
  const currentList = params.get('list')  
  const urlPathName = req.url.split('?')[0]

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

  if (method === 'POST' && urlPathName === '/save') {
    (async () => {
      try {
        const bookToAdd = await getBookName(req)        
        const resMsg = await addBookToDB(currentList, bookToAdd)
        res.writeHead(200, {'content-type':'text/plain'})
        res.end(resMsg)
      } catch (err) {
        res.writeHead(500, {'content-type':'text/plain'})
        res.end(err.message)
      }
    })()
    return
  }
  
  if ( method === 'POST' && urlPathName === '/saveas') {
    handleSaveAs(req, res, currentList)
    return
  }  
  
  if (method === 'GET' && urlPathName === '/books') {
    (async () => {
      try {
        const latestBookList = await readFromDB(currentList)
        res.writeHead(200, {'content-type':'application/json'})
        res.end(JSON.stringify(latestBookList))
      } catch {
        res.writeHead(500)
        res.end('Error reading from file')
      }
    })()
    return
  }
 
  if (method === 'DELETE' && urlPathName === '/delete') {
    (async () => {
      try {
        const bookToDelete = await getBookName(req)        
        deleteBook(currentList, bookToDelete)
        res.writeHead(200)
        res.end('Book deleted')
      } catch {
        res.writeHead(500)
        res.end('Error on delete')
      }
    })()
    return
  }

  if (method === 'DELETE' && urlPathName === '/clear') {
    (async () => {
      try {
        clearList(currentList)
      } catch {
        res.writeHead(500)
        res.end("Error on clear")
      }      
    })()
    return
  }
    
  if (method === 'PUT' && urlPathName === '/edit') {
    let body = ''
    try {
      req.on('data', chn => {body += chn})
      req.on('end', async () => {
        const {oldName, newName} = JSON.parse(body)
        editBook(currentList, oldName, newName)
        res.writeHead(200)
        res.end("Book updated")
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

async function readFromDB(list) {
  const result = await db.query(
    'SELECT title FROM books WHERE list_name = $1 ORDER BY id ASC',
  [list]
  )
  return result.rows.map(row => row.title)
}

async function addBookToDB(list, book) {
  await db.query(
    'INSERT INTO books (list_name, title) VALUES ($1, $2)',
    [list, book]
  )  
}

async function editBook(list, oldName, newName) {
  await db.query(
    'UPDATE books SET title = $1 WHERE list_name = $2 AND title = $3',
    [newName, list, oldName]
  )  
}

async function deleteBook(list, book) {
  await db.query(
    'DELETE FROM books WHERE list_name = $1 AND title = $2',
    [list, book]
  )
}

async function clearList(list) {
  await db.query(
    'DELETE FROM books WHERE list_name = $1',
    [list]
  )
  return 'List cleared'
}

async function handleSaveAs(req, res, curList) {
  try {    
    if (!curList || curList === "") {
      res.writeHead(500)
      res.end('No name input')
      return
    }
    let body = ""
    req.on('data', chunk => body += chunk.toString())
    req.on('end', async () => {
      const newListName = body.trim()
      const exists = await db.query(
        'SELECT 1 FROM books WHERE list_name = $1 LIMIT 1',
        [newListName]
      )
      if (exists.rows.length > 0) {
        res.writeHead(409)
        res.end("List already exists")
        return
      }
      await db.query(`
        INSERT INTO books (list_name, title)
        SELECT $1, title FROM books WHERE list_name = $2        
        `, [newListName, curList])
      res.end(200)  
      res.writeHead("Save as successful")
    })
  } catch (err) {
    console.error(err)
    res.writeHead(500)
    res.end("Error on save as")  
  }
}

server.listen(3000, () => {
  console.log("listening 3000")
})