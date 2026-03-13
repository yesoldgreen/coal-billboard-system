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

      await db.prepare('DELETE FROM module_logistics WHERE billboard_id = $1').run(id);

      for (let index = 0; index < data.length; index++) {
        const item = data[index];
        await db.prepare('INSERT INTO module_logistics (billboard_id, route_type, from_location, to_location, freight, station_name, station_loading_fee, station_fee, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)').run(id, item.route_type, item.from_location, item.to_location, item.freight, item.station_name, item.station_loading_fee, item.station_fee, index);
      }

      await db.exec(`
        INSERT INTO module_update_times (billboard_id, module_type, updated_at)
        VALUES (${id}, 'logistics', CURRENT_TIMESTAMP)
        ON CONFLICT(billboard_id, module_type)
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      `);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });
};
