import pkg from 'pg'

console.log("DB:", process.env.DATABASE_URL)

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export default {
  query: (text, params) => pool.query(text, params),
}
