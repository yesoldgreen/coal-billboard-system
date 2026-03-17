const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// 创建MySQL连接池
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'coal_billboard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 创建一个包装器以保持API兼容性
const dbWrapper = {
  prepare: (sql) => {
    return {
      run: async (...params) => {
        const connection = await pool.getConnection();
        try {
          const [result] = await connection.execute(sql, params);
          return { lastInsertRowid: result.insertId, changes: result.affectedRows };
        } finally {
          connection.release();
        }
      },
      get: async (...params) => {
        const connection = await pool.getConnection();
        try {
          const [rows] = await connection.execute(sql, params);
          return rows[0];
        } finally {
          connection.release();
        }
      },
      all: async (...params) => {
        const connection = await pool.getConnection();
        try {
          const [rows] = await connection.execute(sql, params);
          return rows;
        } finally {
          connection.release();
        }
      }
    };
  },
  exec: async (sql) => {
    const connection = await pool.getConnection();
    try {
      await connection.query(sql);
    } finally {
      connection.release();
    }
  }
};

// 创建表
async function initDatabase() {
  try {
    // 用户表
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 告示牌表 - v1.3.1: 添加 subtitle 字段
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS billboards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255) DEFAULT '实时更新 | 准确可靠',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // v1.4.6.1: 检查并添加 subtitle 字段（兼容旧数据库）
    try {
      const [billboardInfo] = await pool.query(`SHOW COLUMNS FROM billboards`);
      const hasSubtitle = billboardInfo.some(col => col.Field === 'subtitle');
      if (!hasSubtitle) {
        console.log('检测到旧版本数据库，正在添加 subtitle 字段...');
        await dbWrapper.exec(`ALTER TABLE billboards ADD COLUMN subtitle VARCHAR(255) DEFAULT '实时更新 | 准确可靠'`);
        console.log('subtitle 字段添加成功');
      }
    } catch (error) {
      console.error('检查 subtitle 字段时出错:', error);
    }

    // 排队拉运表 - v1.4.5: 添加 previous_queuing 字段用于颜色对比
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS module_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        pit_name TEXT NOT NULL,
        contracted TEXT,
        queuing TEXT,
        called TEXT,
        entered TEXT,
        sort_order INTEGER DEFAULT 0,
        previous_queuing TEXT DEFAULT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // v1.4.6.1: 检查并添加 previous_queuing 字段（兼容旧数据库）
    try {
      const [tableInfo] = await pool.query(`SHOW COLUMNS FROM module_queue`);
      const hasPreviousQueuing = tableInfo.some(col => col.Field === 'previous_queuing');
      if (!hasPreviousQueuing) {
        console.log('检测到旧版本数据库，正在添加 previous_queuing 字段...');
        await dbWrapper.exec(`ALTER TABLE module_queue ADD COLUMN previous_queuing VARCHAR(255) DEFAULT NULL`);
        console.log('previous_queuing 字段添加成功');
      }
    } catch (error) {
      console.error('检查 previous_queuing 字段时出错:', error);
    }

    // 质量/价格表
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS module_quality_price (
        id INT AUTO_INCREMENT PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        pit_name TEXT NOT NULL,
        heat_value TEXT,
        ash TEXT,
        sulfur TEXT,
        price TEXT,
        change_value TEXT,
        sort_order INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // 物流费用表
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS module_logistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        route_type TEXT NOT NULL,
        from_location TEXT,
        to_location TEXT,
        freight TEXT,
        station_name TEXT,
        station_loading_fee TEXT,
        station_fee TEXT,
        sort_order INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // v1.4.6.1: 检查并重命名 station_freight 为 station_loading_fee（兼容旧数据库）
    try {
      const [logisticsInfo] = await pool.query(`SHOW COLUMNS FROM module_logistics`);
      const hasStationFreight = logisticsInfo.some(col => col.Field === 'station_freight');
      const hasStationLoadingFee = logisticsInfo.some(col => col.Field === 'station_loading_fee');

      if (hasStationFreight && !hasStationLoadingFee) {
        console.log('检测到旧版本数据库，正在重命名 station_freight 为 station_loading_fee...');
        // SQLite 不支持直接重命名列，需要重建表
        await dbWrapper.exec(`
          ALTER TABLE module_logistics RENAME TO module_logistics_old;

          CREATE TABLE module_logistics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            billboard_id INTEGER NOT NULL,
            route_type TEXT NOT NULL,
            from_location TEXT,
            to_location TEXT,
            freight TEXT,
            station_name TEXT,
            station_loading_fee TEXT,
            station_fee TEXT,
            sort_order INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
          );

          INSERT INTO module_logistics (id, billboard_id, route_type, from_location, to_location, freight, station_name, station_loading_fee, station_fee, sort_order, updated_at)
          SELECT id, billboard_id, route_type, from_location, to_location, freight, station_name, station_freight, station_fee, sort_order, updated_at
          FROM module_logistics_old;

          DROP TABLE module_logistics_old;
        `);
        console.log('station_loading_fee 字段重命名成功');
      }
    } catch (error) {
      console.error('检查 station_loading_fee 字段时出错:', error);
    }

    // 广告表
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        module_type TEXT NOT NULL,
        content TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // 模块更新时间表 - v1.4.4: 添加 price_execution_time 字段
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS module_update_times (
        id INT AUTO_INCREMENT PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        module_type TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        price_execution_time TEXT DEFAULT NULL,
        UNIQUE(billboard_id, module_type),
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // v1.4.6.1: 检查并添加 price_execution_time 字段（兼容旧数据库）
    try {
      const [updateTimesInfo] = await pool.query(`SHOW COLUMNS FROM module_update_times`);
      const hasPriceExecutionTime = updateTimesInfo.some(col => col.Field === 'price_execution_time');
      if (!hasPriceExecutionTime) {
        console.log('检测到旧版本数据库，正在添加 price_execution_time 字段...');
        await dbWrapper.exec(`ALTER TABLE module_update_times ADD COLUMN price_execution_time TEXT DEFAULT NULL`);
        console.log('price_execution_time 字段添加成功');
      }
    } catch (error) {
      console.error('检查 price_execution_time 字段时出错:', error);
    }

    // v1.5: 自动填充映射表
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS autofill_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        billboard_id INTEGER NOT NULL,
        module_type TEXT NOT NULL,
        source_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(billboard_id, module_type, source_name),
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // 初始化默认用户
    const userExists = await dbWrapper.prepare('SELECT id FROM users WHERE username = ?').get('hulianshikong');
    if (!userExists) {
      const hashedPassword = bcrypt.hashSync('hlsk2026', 10);
      await dbWrapper.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('hulianshikong', hashedPassword);
      console.log('默认用户已创建');
    }

    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

initDatabase();

module.exports = dbWrapper;
