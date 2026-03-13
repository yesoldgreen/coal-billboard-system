const db = require('../../../lib/database');
const { authenticateToken } = require('../../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return authenticateToken(req, res, async () => {
    try {
      const { id } = req.query;

      const billboard = await db.prepare('SELECT * FROM billboards WHERE id = $1').get(id);
      if (!billboard) {
        return res.status(404).json({ error: '告示牌不存在' });
      }

      const queueData = await db.prepare('SELECT * FROM module_queue WHERE billboard_id = $1 ORDER BY sort_order').all(id);
      const qualityData = await db.prepare('SELECT * FROM module_quality_price WHERE billboard_id = $1 ORDER BY sort_order').all(id);
      const logisticsData = await db.prepare('SELECT * FROM module_logistics WHERE billboard_id = $1 ORDER BY sort_order').all(id);
      const queueAds = await db.prepare('SELECT * FROM advertisements WHERE billboard_id = $1 AND module_type = $2 ORDER BY sort_order').all(id, 'queue');
      const qualityAds = await db.prepare('SELECT * FROM advertisements WHERE billboard_id = $1 AND module_type = $2 ORDER BY sort_order').all(id, 'quality');
      const logisticsAds = await db.prepare('SELECT * FROM advertisements WHERE billboard_id = $1 AND module_type = $2 ORDER BY sort_order').all(id, 'logistics');
      const updateTimes = await db.prepare('SELECT * FROM module_update_times WHERE billboard_id = $1').all(id);

      res.json({
        success: true,
        data: {
          billboard,
          queue: queueData,
          quality: qualityData,
          logistics: logisticsData,
          queueAds,
          qualityAds,
          logisticsAds,
          updateTimes
        }
      });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });
};
