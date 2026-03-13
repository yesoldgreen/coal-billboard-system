const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'billboard.db');
const db = new sqlite3.Database(dbPath);

// v1.4.5: 为module_queue表添加previous_queuing字段，用于记录上次的排队中数据
console.log('开始迁移到 v1.4.5...');

db.run(`
    ALTER TABLE module_queue ADD COLUMN previous_queuing TEXT DEFAULT NULL
`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('✓ previous_queuing字段已存在，跳过迁移');
        } else {
            console.error('迁移失败:', err.message);
        }
    } else {
        console.log('✓ 成功添加previous_queuing字段');
    }

    db.close(() => {
        console.log('迁移完成，数据库已关闭');
    });
});
