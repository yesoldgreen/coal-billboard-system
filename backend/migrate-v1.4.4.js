const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'billboard.db');
const db = new sqlite3.Database(dbPath);

// v1.4.4: 为module_update_times表添加price_execution_time字段
console.log('开始迁移到 v1.4.4...');

db.run(`
    ALTER TABLE module_update_times ADD COLUMN price_execution_time TEXT DEFAULT NULL
`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('✓ price_execution_time字段已存在，跳过迁移');
        } else {
            console.error('迁移失败:', err.message);
        }
    } else {
        console.log('✓ 成功添加price_execution_time字段');
    }

    db.close(() => {
        console.log('迁移完成，数据库已关闭');
    });
});
