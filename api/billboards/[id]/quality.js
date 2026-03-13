const db = require('../../../lib/database');
const { authenticateToken } = require('../../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return authenticateToken(req, res, async () => {
    try {
      const { id } = req.query;
      const { data, priceExecutionTime } = req.body;

      await db.prepare('DELETE FROM module_quality_price WHERE billboard_id = $1').run(id);

      for (let index = 0; index < data.length; index++) {
        const item = data[index];
        await db.prepare('INSERT INTO module_quality_price (billboard_id, pit_name, heat_value, ash, sulfur, price, change_value, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)').run(id, item.pit_name, item.heat_value, item.ash, item.sulfur, item.price, item.change_value, index);
      }

      const executionTimeValue = priceExecutionTime || null;
      await db.exec(`
        INSERT INTO module_update_times (billboard_id, module_type, updated_at, price_execution_time)
        VALUES (${id}, 'quality', CURRENT_TIMESTAMP, ${executionTimeValue ? `'${executionTimeValue.replace(/'/g, "''")}'` : 'NULL'})
        ON CONFLICT(billboard_id, module_type)
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP, price_execution_time = ${executionTimeValue ? `'${executionTimeValue.replace(/'/g, "''")}'` : 'NULL'}
      `);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });
};
