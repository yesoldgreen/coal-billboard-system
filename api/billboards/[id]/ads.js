const db = require('../../../lib/database');
const { authenticateToken } = require('../../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return authenticateToken(req, res, async () => {
    try {
      const { id } = req.query;
      const { moduleType, data } = req.body;

      await db.prepare('DELETE FROM advertisements WHERE billboard_id = $1 AND module_type = $2').run(id, moduleType);

      if (data && data.length > 0) {
        for (let index = 0; index < data.length; index++) {
          const item = data[index];
          await db.prepare('INSERT INTO advertisements (billboard_id, module_type, content, sort_order) VALUES ($1, $2, $3, $4)').run(id, moduleType, item.content, index);
        }
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });
};
