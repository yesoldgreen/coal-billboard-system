const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'billboard.db');
const db = new sqlite3.Database(dbPath);

console.log('开始数据库迁移到 v1.3.2...');
console.log('主要变更：为billboards表添加subtitle字段');
console.log('');

db.serialize(() => {
    // 添加subtitle字段
    console.log('[1/2] 为billboards表添加subtitle字段...');
    db.run(`
        ALTER TABLE billboards ADD COLUMN subtitle TEXT DEFAULT '实时更新 | 准确可靠'
    `, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ subtitle字段已存在，跳过');
            } else {
                console.error('❌ 添加subtitle字段失败:', err);
                process.exit(1);
            }
        } else {
            console.log('✅ subtitle字段添加成功');
        }
    });

    // 验证迁移
    setTimeout(() => {
        console.log('[2/2] 验证迁移结果...');
        db.all('PRAGMA table_info(billboards)', (err, rows) => {
            if (err) {
                console.error('❌ 验证失败:', err);
                process.exit(1);
            }

            const hasSubtitle = rows.some(row => row.name === 'subtitle');
            if (hasSubtitle) {
                console.log('✅ 验证成功 - subtitle字段已存在');
                console.log('');
                console.log('🎉 数据库迁移完成！');
                console.log('版本: v1.3.2');
                console.log('');
            } else {
                console.error('❌ 验证失败 - subtitle字段不存在');
                process.exit(1);
            }

            db.close();
        });
    }, 200);
});
