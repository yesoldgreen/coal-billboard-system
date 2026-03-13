const db = require('../../../lib/database');
const { authenticateToken } = require('../../../lib/auth');

module.exports = async (req, res) => {
  const { id } = req.query;

  if (req.method === 'PUT') {
    return authenticateToken(req, res, async () => {
      try {
        const { name, subtitle } = req.body;
        if (!name) {
          return res.status(400).json({ error: '告示牌名称不能为空' });
        }
        const subtitleValue = subtitle !== undefined ? subtitle : '实时更新 | 准确可靠';
        await db.prepare('UPDATE billboards SET name = $1, subtitle = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3').run(name, subtitleValue, id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: '服务器错误' });
      }
    });
  }

  if (req.method === 'DELETE') {
    return authenticateToken(req, res, async () => {
      try {
        await db.prepare('DELETE FROM billboards WHERE id = $1').run(id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: '服务器错误' });
      }
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
