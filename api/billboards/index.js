const db = require('../../lib/database');
const { authenticateToken } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return authenticateToken(req, res, async () => {
      try {
        const billboards = await db.prepare('SELECT * FROM billboards ORDER BY created_at DESC').all();
        res.json({ success: true, data: billboards });
      } catch (error) {
        res.status(500).json({ error: '服务器错误' });
      }
    });
  }

  if (req.method === 'POST') {
    return authenticateToken(req, res, async () => {
      try {
        const { name, subtitle } = req.body;
        if (!name) {
          return res.status(400).json({ error: '告示牌名称不能为空' });
        }
        const subtitleValue = subtitle || '实时更新 | 准确可靠';
        const result = await db.prepare('INSERT INTO billboards (name, subtitle) VALUES ($1, $2) RETURNING id').run(name, subtitleValue);
        res.json({ success: true, data: { id: result.lastInsertRowid, name, subtitle: subtitleValue } });
      } catch (error) {
        res.status(500).json({ error: '服务器错误' });
      }
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
