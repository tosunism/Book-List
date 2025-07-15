import 'dotenv/config'
import db from './db.js'

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
