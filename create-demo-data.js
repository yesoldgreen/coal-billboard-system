#!/usr/bin/env node

/**
 * 创建演示数据脚本
 * 用于快速体验系统功能
 */

const Database = require('better-sqlite3');
const path = require('path');

console.log('开始创建演示数据...\n');

const db = new Database(path.join(__dirname, 'backend', 'billboard.db'));

// 创建演示告示牌
const createBillboard = db.prepare('INSERT INTO billboards (name) VALUES (?)');
const billboardResult = createBillboard.run('汇能长滩 煤矿内参');
const billboardId = billboardResult.lastInsertRowid;

console.log(`✓ 创建告示牌: 汇能长滩 煤矿内参 (ID: ${billboardId})`);

// 插入排队拉运数据
const insertQueue = db.prepare(`
  INSERT INTO module_queue (billboard_id, pit_name, contracted, queuing, called, entered, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const queueData = [
  ['汇能2号', '50', '15', '8', '3', 0],
  ['汇能3号', '45', '12', '6', '2', 1],
  ['汇能4号', '38', '10', '5', '1', 2],
  ['汇能5号', '42', '14', '7', '4', 3],
  ['汇能6号', '35', '9', '4', '2', 4],
  ['汇能7号', '40', '11', '6', '3', 5],
];

queueData.forEach(row => {
  insertQueue.run(billboardId, ...row);
});

console.log(`✓ 插入排队拉运数据: ${queueData.length} 条`);

// 插入排队拉运广告
const insertAd = db.prepare(`
  INSERT INTO advertisements (billboard_id, module_type, content, sort_order)
  VALUES (?, ?, ?, ?)
`);

insertAd.run(billboardId, 'queue', '八通煤炭 136 1234 5678 汇能长滩专业代发 九年老店', 0);
console.log('✓ 插入排队拉运广告');

// 插入质量/价格数据
const insertQuality = db.prepare(`
  INSERT INTO module_quality_price (billboard_id, pit_name, heat_value, ash, sulfur, price, change_value, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const qualityData = [
  ['汇能2号', '5000', '15', '0.5', '680', '+10', 0],
  ['汇能3号', '5200', '14', '0.4', '720', '+15', 1],
  ['汇能4号', '4800', '16', '0.6', '650', '-5', 2],
  ['汇能5号', '5100', '15', '0.5', '700', '0', 3],
];

qualityData.forEach(row => {
  insertQuality.run(billboardId, ...row);
});

console.log(`✓ 插入质量/价格数据: ${qualityData.length} 条`);

// 插入质量/价格广告
insertAd.run(billboardId, 'quality', '优质煤炭供应商 联系电话：139 8888 6666', 0);
console.log('✓ 插入质量/价格广告');

// 插入物流费用数据
const insertLogistics = db.prepare(`
  INSERT INTO module_logistics (billboard_id, route_type, from_location, to_location, freight, station_name, station_freight, station_fee, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const logisticsData = [
  ['direct', '长滩矿', '邯郸', '120', '', '', '', 0],
  ['direct', '长滩矿', '孝义', '95', '', '', '', 1],
  ['station', '', '', '', '长滩集运站', '30', '15', 2],
  ['direct', '长滩矿', '介休', '85', '', '', '', 3],
];

logisticsData.forEach(row => {
  insertLogistics.run(billboardId, ...row);
});

console.log(`✓ 插入物流费用数据: ${logisticsData.length} 条`);

// 插入物流费用广告
insertAd.run(billboardId, 'logistics', '友达物流 138 0000 8888 汇能长滩派山店专线 河北 内蒙', 0);
insertAd.run(billboardId, 'logistics', '快快物流 138 2222 6666 汇能长滩上站装园', 1);
console.log('✓ 插入物流费用广告');

// 更新模块更新时间
const updateTime = db.prepare(`
  INSERT INTO module_update_times (billboard_id, module_type, updated_at)
  VALUES (?, ?, CURRENT_TIMESTAMP)
`);

updateTime.run(billboardId, 'queue');
updateTime.run(billboardId, 'quality');
updateTime.run(billboardId, 'logistics');

console.log('✓ 更新模块时间戳\n');

db.close();

console.log('========================================');
console.log('演示数据创建成功！');
console.log('========================================');
console.log('');
console.log('下一步：');
console.log('1. 启动服务: ./start-all.sh');
console.log('2. 访问后台: http://localhost:3001');
console.log('3. 登录账号: hulianshikong');
console.log('4. 登录密码: hlsk2026');
console.log(`5. 查看演示告示牌: http://localhost:3002/billboard/${billboardId}`);
console.log('');
