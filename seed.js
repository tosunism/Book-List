import 'dotenv/config'
import db from './db.js'

/*
async function seed() {
    try {
        await db.query(
            "INSERT INTO books (list_name, title) VALUES ($1, $2)",
            ['Book List', 'Book 1']
        )
        console.log("Successful")
    } catch (err) {
        console.error(err.message)
    } finally {
        process.exit()
    }    
}

seed()
*/
let newList 
let oldList
async function test(){
    await db.query(
        `SELECT $1, FROM books WHERE list_name = $2
        `, [newList, oldList]
    )
}