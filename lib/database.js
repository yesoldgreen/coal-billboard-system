const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const db = {
  query: (text, params) => pool.query(text, params),

  async prepare(sql) {
    return {
      run: async (...params) => {
        const result = await pool.query(sql, params);
        return {
          lastInsertRowid: result.rows[0]?.id,
          changes: result.rowCount
        };
      },
      get: async (...params) => {
        const result = await pool.query(sql, params);
        return result.rows[0];
      },
      all: async (...params) => {
        const result = await pool.query(sql, params);
        return result.rows;
      }
    };
  },

  async exec(sql) {
    const statements = sql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
  }
};

module.exports = db;
