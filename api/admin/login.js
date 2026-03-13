const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../lib/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    const user = await db.prepare('SELECT * FROM users WHERE username = $1').get(username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
};
