const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'billboard.db');
const db = new sqlite3.Database(dbPath);

// 创建一个同步包装器
const dbWrapper = {
  prepare: (sql) => {
    return {
      run: (...params) => {
        return new Promise((resolve, reject) => {
          db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
          });
        });
      },
      get: (...params) => {
        return new Promise((resolve, reject) => {
          db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
      all: (...params) => {
        return new Promise((resolve, reject) => {
          db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      }
    };
  },
  exec: (sql) => {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// 创建表
async function initDatabase() {
  try {
    // 用户表
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 告示牌表 - v1.3.1: 添加 subtitle 字段
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS billboards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subtitle TEXT DEFAULT '实时更新 | 准确可靠',
        display_settings TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 检查并补齐 billboards 表字段（兼容旧数据库）
    try {
      const billboardInfo = await dbWrapper.prepare(`PRAGMA table_info(billboards)`).all();
      const hasSubtitle = billboardInfo.some(col => col.name === 'subtitle');
      const hasDisplaySettings = billboardInfo.some(col => col.name === 'display_settings');
      if (!hasSubtitle) {
        console.log('检测到旧版本数据库，正在添加 subtitle 字段...');
        await dbWrapper.exec(`ALTER TABLE billboards ADD COLUMN subtitle TEXT DEFAULT '实时更新 | 准确可靠'`);
        console.log('subtitle 字段添加成功');
      }
      if (!hasDisplaySettings) {
        console.log('检测到旧版本数据库，正在添加 display_settings 字段...');
        await dbWrapper.exec(`ALTER TABLE billboards ADD COLUMN display_settings TEXT DEFAULT NULL`);
        console.log('display_settings 字段添加成功');
      }
    } catch (error) {
      console.error('检查 billboards 字段时出错:', error);
    }

    // 排队拉运表 - v1.4.5: 添加 previous_queuing 字段用于颜色对比
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS module_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      const tableInfo = await dbWrapper.prepare(`PRAGMA table_info(module_queue)`).all();
      const hasPreviousQueuing = tableInfo.some(col => col.name === 'previous_queuing');
      if (!hasPreviousQueuing) {
        console.log('检测到旧版本数据库，正在添加 previous_queuing 字段...');
        await dbWrapper.exec(`ALTER TABLE module_queue ADD COLUMN previous_queuing TEXT DEFAULT NULL`);
        console.log('previous_queuing 字段添加成功');
      }
    } catch (error) {
      console.error('检查 previous_queuing 字段时出错:', error);
    }

    // 质量/价格表
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS module_quality_price (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      const logisticsInfo = await dbWrapper.prepare(`PRAGMA table_info(module_logistics)`).all();
      const hasStationFreight = logisticsInfo.some(col => col.name === 'station_freight');
      const hasStationLoadingFee = logisticsInfo.some(col => col.name === 'station_loading_fee');

      if (hasStationFreight && !hasStationLoadingFee) {
        console.log('检测到旧版本数据库，正在重命名 station_freight 为 station_loading_fee...');
        // SQLite 不支持直接重命名列，需要重建表
        await dbWrapper.exec(`
          ALTER TABLE module_logistics RENAME TO module_logistics_old;

          CREATE TABLE module_logistics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      const updateTimesInfo = await dbWrapper.prepare(`PRAGMA table_info(module_update_times)`).all();
      const hasPriceExecutionTime = updateTimesInfo.some(col => col.name === 'price_execution_time');
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        billboard_id INTEGER NOT NULL,
        module_type TEXT NOT NULL,
        source_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(billboard_id, module_type, source_name),
        FOREIGN KEY (billboard_id) REFERENCES billboards(id) ON DELETE CASCADE
      )
    `);

    // v1.7: 机器人入站日志表
    await dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS inbound_message_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL DEFAULT 'wechat-bot',
        billboard_id INTEGER,
        module_type TEXT,
        format_code TEXT,
        content_type TEXT,
        client_ip TEXT,
        raw_text TEXT NOT NULL,
        status TEXT NOT NULL,
        result_summary TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
