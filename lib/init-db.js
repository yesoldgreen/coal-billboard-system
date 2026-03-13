const bcrypt = require('bcryptjs');
const db = require('./database');

async function initDatabase() {
  try {
    // 用户表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 告示牌表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS billboards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255) DEFAULT '实时更新 | 准确可靠',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 排队拉运表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS module_queue (
        id SERIAL PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        pit_name VARCHAR(255) NOT NULL,
        contracted TEXT,
        queuing TEXT,
        called TEXT,
        entered TEXT,
        sort_order INTEGER DEFAULT 0,
        previous_queuing TEXT DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // 质量/价格表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS module_quality_price (
        id SERIAL PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        pit_name VARCHAR(255) NOT NULL,
        heat_value TEXT,
        ash TEXT,
        sulfur TEXT,
        price TEXT,
        change_value TEXT,
        sort_order INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // 物流费用表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS module_logistics (
        id SERIAL PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        route_type VARCHAR(50) NOT NULL,
        from_location VARCHAR(255),
        to_location VARCHAR(255),
        freight TEXT,
        station_name VARCHAR(255),
        station_loading_fee TEXT,
        station_fee TEXT,
        sort_order INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // 广告表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id SERIAL PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        module_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // 模块更新时间表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS module_update_times (
        id SERIAL PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        module_type VARCHAR(50) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        price_execution_time TEXT DEFAULT NULL,
        UNIQUE(billboard_id, module_type),
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // v1.5: 自动填充映射表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS autofill_mappings (
        id SERIAL PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        module_type VARCHAR(50) NOT NULL,
        source_name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(billboard_id, module_type, source_name),
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // 初始化默认用户
    const userCheck = await db.prepare('SELECT id FROM users WHERE username = $1');
    const userExists = await userCheck.get('hulianshikong');

    if (!userExists) {
      const hashedPassword = bcrypt.hashSync('hlsk2026', 10);
      await db.prepare('INSERT INTO users (username, password) VALUES ($1, $2)').run('hulianshikong', hashedPassword);
      console.log('默认用户已创建');
    }

    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

// 仅在直接运行时执行
if (require.main === module) {
  initDatabase().then(() => process.exit(0));
}

module.exports = initDatabase;
