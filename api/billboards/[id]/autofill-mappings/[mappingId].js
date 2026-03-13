const db = require('../../../../lib/database');
const { authenticateToken } = require('../../../../lib/auth');

module.exports = async (req, res) => {
  const { mappingId } = req.query;

  if (req.method === 'PUT') {
    return authenticateToken(req, res, async () => {
      try {
        const { source_name, display_name } = req.body;
        if (!source_name || !display_name) {
          return res.status(400).json({ error: '参数错误' });
        }
        await db.prepare('UPDATE autofill_mappings SET source_name = $1, display_name = $2 WHERE id = $3').run(source_name, display_name, mappingId);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: '服务器错误' });
      }
    });
  }

  if (req.method === 'DELETE') {
    return authenticateToken(req, res, async () => {
      try {
        await db.prepare('DELETE FROM autofill_mappings WHERE id = $1').run(mappingId);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: '服务器错误' });
      }
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
