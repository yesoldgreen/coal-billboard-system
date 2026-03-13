const db = require('../../../../lib/database');
const { authenticateToken } = require('../../../../lib/auth');

module.exports = async (req, res) => {
  const { id } = req.query;

  if (req.method === 'GET') {
    return authenticateToken(req, res, async () => {
      try {
        const { module } = req.query;
        if (!module) {
          return res.status(400).json({ error: '需要指定module参数' });
        }
        const mappings = await db.prepare('SELECT * FROM autofill_mappings WHERE billboard_id = $1 AND module_type = $2 ORDER BY created_at').all(id, module);
        res.json({ success: true, data: mappings });
      } catch (error) {
        res.status(500).json({ error: '服务器错误' });
      }
    });
  }

  if (req.method === 'POST') {
    return authenticateToken(req, res, async () => {
      try {
        const { module, mappings } = req.body;
        if (!module || !mappings || !Array.isArray(mappings)) {
          return res.status(400).json({ error: '参数错误' });
        }
        for (const mapping of mappings) {
          await db.query(
            'INSERT INTO autofill_mappings (billboard_id, module_type, source_name, display_name) VALUES ($1, $2, $3, $4) ON CONFLICT (billboard_id, module_type, source_name) DO UPDATE SET display_name = $4',
            [id, module, mapping.source_name, mapping.display_name]
          );
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: '服务器错误' });
      }
    });
  }

  if (req.method === 'DELETE') {
    return authenticateToken(req, res, async () => {
      try {
        const { module } = req.query;
        if (!module) {
          return res.status(400).json({ error: '需要指定module参数' });
        }
        await db.prepare('DELETE FROM autofill_mappings WHERE billboard_id = $1 AND module_type = $2').run(id, module);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: '服务器错误' });
      }
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
