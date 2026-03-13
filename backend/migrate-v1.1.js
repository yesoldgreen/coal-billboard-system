const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'billboard.db');
const db = new sqlite3.Database(dbPath);

console.log('开始数据库迁移到 v1.1...');
console.log('主要变更：');
console.log('1. 物流类型：direct→highway, 新增railway');
console.log('2. 字段重命名：station_freight→station_loading_fee（上站费）');
console.log('');

db.serialize(() => {
    // 1. 创建新表
    console.log('[1/5] 创建新的物流费用表...');
    db.run(`
        CREATE TABLE IF NOT EXISTS module_logistics_v11 (
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
    `, (err) => {
        if (err) {
            console.error('❌ 创建新表失败:', err);
            process.exit(1);
        }
        console.log('✅ 新表创建成功');
    });

    // 2. 迁移数据（将direct改为highway）
    setTimeout(() => {
        console.log('[2/5] 迁移现有数据...');
        db.run(`
            INSERT INTO module_logistics_v11
            (id, billboard_id, route_type, from_location, to_location, freight, station_name, station_loading_fee, station_fee, sort_order, updated_at)
            SELECT
                id,
                billboard_id,
                CASE
                    WHEN route_type = 'direct' THEN 'highway'
                    ELSE route_type
                END as route_type,
                from_location,
                to_location,
                freight,
                station_name,
                station_freight as station_loading_fee,
                station_fee,
                sort_order,
                updated_at
            FROM module_logistics
        `, (err) => {
            if (err) {
                console.error('❌ 数据迁移失败:', err);
                process.exit(1);
            }
            console.log('✅ 数据迁移成功');
        });
    }, 100);

    // 3. 删除旧表
    setTimeout(() => {
        console.log('[3/5] 删除旧表...');
        db.run('DROP TABLE IF EXISTS module_logistics', (err) => {
            if (err) {
                console.error('❌ 删除旧表失败:', err);
                process.exit(1);
            }
            console.log('✅ 旧表删除成功');
        });
    }, 200);

    // 4. 重命名新表
    setTimeout(() => {
        console.log('[4/5] 重命名新表...');
        db.run('ALTER TABLE module_logistics_v11 RENAME TO module_logistics', (err) => {
            if (err) {
                console.error('❌ 重命名表失败:', err);
                process.exit(1);
            }
            console.log('✅ 表重命名成功');
        });
    }, 300);

    // 5. 验证迁移
    setTimeout(() => {
        console.log('[5/5] 验证迁移结果...');
        db.all('SELECT * FROM module_logistics LIMIT 5', (err, rows) => {
            if (err) {
                console.error('❌ 验证失败:', err);
                process.exit(1);
            }
            console.log('✅ 验证成功');
            console.log(`当前数据条数: ${rows.length}`);
            console.log('');
            console.log('🎉 数据库迁移完成！');
            console.log('版本: v1.1');
            console.log('');
            db.close();
        });
    }, 400);
});
