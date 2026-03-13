const db = require('../../../lib/database');
const { authenticateToken } = require('../../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return authenticateToken(req, res, async () => {
    try {
      const { id } = req.query;
      const { data } = req.body;

      // 读取旧数据
      const oldData = await db.prepare('SELECT pit_name, queuing FROM module_queue WHERE billboard_id = $1').all(id);
      const oldQueuingMap = {};
      oldData.forEach(item => {
        oldQueuingMap[item.pit_name] = item.queuing;
      });

      // 删除旧数据
      await db.prepare('DELETE FROM module_queue WHERE billboard_id = $1').run(id);

      // 插入新数据
      for (let index = 0; index < data.length; index++) {
        const item = data[index];
        const previousQueuing = oldQueuingMap[item.pit_name] || null;
        await db.prepare('INSERT INTO module_queue (billboard_id, pit_name, contracted, queuing, called, entered, sort_order, previous_queuing) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)').run(id, item.pit_name, item.contracted, item.queuing, item.called, item.entered, index, previousQueuing);
      }

      // 更新时间
      await db.exec(`
        INSERT INTO module_update_times (billboard_id, module_type, updated_at)
        VALUES (${id}, 'queue', CURRENT_TIMESTAMP)
        ON CONFLICT(billboard_id, module_type)
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      `);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });
};
