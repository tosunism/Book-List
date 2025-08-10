import 'dotenv/config'
import { createServer, get } from 'http'
import { appendFile, existsSync, readFile, writeFile } from 'fs'
import { resolve } from 'path'
import db from './db.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iurqiqsczhfsmtpcbhjh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cnFpcXNjemhmc210cGNiaGpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQzMDExOSwiZXhwIjoyMDY4MDA2MTE5fQ.94dzf5TP8xLMwLAiFRY-DPoDoAw_q3IQbFBSdeQuq3E'  
)

async function authenticateUser(req) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return {error: 'No token'}
  const {data: {user}, error} = await supabase.auth.getUser(token)
  if (error || !user) return {error:'Invalid token'}
  return {user}
}

async function withAuth(req, res, handler){
  const {user, error} = await authenticateUser(req)
  if (error){
    res.writeHead(500)
    res.end(JSON.stringify(error))
    return
  }
  req.user = user
  await handler(req, res, user)
}

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
    withAuth(req, res, async (req, res, user) => {
      try {
        const bookToAdd = await getBookName(req)        
        const resMsg = await addBookToDB(currentList, bookToAdd, user)
        res.writeHead(200, {'content-type':'text/plain'})
        res.end(resMsg)
      } catch (err) {
        res.writeHead(500, {'content-type':'text/plain'})
        res.end(err.message)
      }
    })
    return
  }

  if ( method === 'POST' && urlPathName === '/saveas') {  
    withAuth(req, res, handleSaveAs)
    return
  }  
  
  if (method === 'DELETE' && urlPathName === '/deletelist') {
    withAuth(req, res, deleteList)    
    return
  }

  if (method === 'GET' && urlPathName === '/books') {
    withAuth(req, res, async (req, res, user) => {
      try {        
        const latestBookList = await readFromDB(currentList, user)
        res.writeHead(200, {'content-type':'application/json'})
        res.end(JSON.stringify(latestBookList))
      } catch {
        res.writeHead(500)
        res.end('Error reading from file')
      }
    })
    return
  }
 
  if (method === 'GET' && urlPathName === '/mylists') {    
    withAuth(req, res, showLists)    
    return
  }

  if (method === 'DELETE' && urlPathName === '/delete'){
    withAuth(req, res, async (req, res, user) => {
      try {
        const bookToDelete = await getBookName(req)
        await deleteBook(currentList, bookToDelete, user)
        res.writeHead(200)
        res.end("Book deleted")
      } catch (err) {
        res.writeHead(500)
        res.end(err.message)
      }
    })
    return
  }

  if (method === 'DELETE' && urlPathName === '/clear'){
    withAuth(req, res, (req, res, user) => {
      try {
        const result = clearList(currentList, user)
        res.writeHead(200)
        res.end(result)
      } catch (err) {
        res.writeHead(500)
        res.end("Error on clear " + err.message)
      }
    })
    return
  }    

  if (method === 'PUT' && urlPathName === '/edit'){
    withAuth(req, res, async (req, res, user) => {
      await editBook(req, res, user, currentList)
    })
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

async function readFromDB(list, user) {
  const result = await db.query(
    'SELECT title FROM books WHERE list_name = $1 AND user_id = $2 ORDER BY id ASC',
  [list, user.id]
  )
  return result.rows.map(row => row.title)
}

async function addBookToDB(list, book, user) {
  await db.query(
    'INSERT INTO books (list_name, title, user_id) VALUES ($1, $2, $3)',
    [list, book, user.id]
  )  
}

async function editBook(req, res, user, list){  
    try {
      const body = await getReqBody(req)
      const { oldName, newName} = JSON.parse(body)
      await db.query(
          'UPDATE books SET title = $1 WHERE list_name = $2 AND title = $3 AND user_id = $4',
          [newName, list, oldName, user.id]
      )
      res.writeHead(200) 
      res.end("Book updated")
    } catch {
      res.writeHead(500)
      res.end("Error on update")
    }    
}

async function getReqBody(req){
  return new Promise((res, rej) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => res(body))
    req.on('error', rej)
  })
}

async function deleteBook(list, book, user) {
  await db.query(
    'DELETE FROM books WHERE list_name = $1 AND title = $2 AND user_id = $3',
    [list, book, user.id]
  )
}

async function clearList(list, user) {
  await db.query(
    'DELETE FROM books WHERE list_name = $1 AND user_id = $2',
    [list, user.id]
  )
  return 'List cleared'
}

async function deleteList(req, res, user) {
  const listToDelete = await getBookName(req)  
  try {
    await db.query('DELETE FROM books WHERE list_name = $1 AND user_id = $2', [listToDelete, user.id])
    res.writeHead(200)
    res.end('List deleted')
  } catch (err) {
    res.writeHead(500)
    res.end('Error deleting list: ' + err.message)
  }
}

async function showLists(req, res, user) {  
  try {
    const result = await db.query('SELECT DISTINCT list_name FROM books WHERE user_id = $1', [user.id])
    const lists = result.rows.map(row => row.list_name)
    res.writeHead(200, {'content-type': 'application/json'})
    res.end(JSON.stringify(lists))
  } catch (err) {    
    res.writeHead(500)
    res.end("Error on lists query" + err.message)
  }
}

async function handleSaveAs(req, res, user) {
  try {    
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams
    const currentList = params.get('list')
    if (!currentList || currentList === "") {
      res.writeHead(500)
      res.end('No name input')
      return
    }
    let body = ""
    req.on('data', chunk => body += chunk.toString())
    req.on('end', async () => {      
      const {oldListName, newListName} = JSON.parse(body)      
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
        `, [newListName, oldListName])
      res.writeHead(200)  
      res.end("Save as successful")
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