const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const path = require('path');
const { applyInboundAutofill, getInboundFormatMetadata } = require('./autofill');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'coal-billboard-secret-key-2026';
const ALLOWED_MODULES = ['queue', 'quality', 'logistics'];
const ALLOWED_COLUMN_GROUPS = ['highway', 'station', 'railway'];
const ALLOWED_REGULAR_COLUMNS = {
  queue: ['0', '1', '2', '3', '4'],
  quality: ['0', '1', '2', '3', '4', '5']
};
const ALLOWED_LOGISTICS_COLUMNS = [
  'highway-from',
  'highway-freight',
  'station-name',
  'station-loading',
  'station-fee',
  'railway-from',
  'railway-freight'
];

// 获取本地时间字符串
function getLocalDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.text({ type: ['text/plain'], limit: '1mb' }));

// 提供静态文件服务
app.use('/site', express.static(path.join(__dirname, '../public/site')));
app.use('/client', express.static(path.join(__dirname, '../public/client')));
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));
app.get('/', (req, res) => {
  res.redirect('/site/');
});

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未授权访问' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token无效或已过期' });
    }
    req.user = user;
    next();
  });
};

function getRequestClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return String(forwardedFor).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
}

function getInboundRequestData(req) {
  const headers = req.headers;
  const body = req.body;
  const rawText = typeof body === 'string' ? body.trim() : String(body?.raw_text || '').trim();
  const billboardIdValue = headers['x-billboard-id'] || body?.billboard_id;
  const moduleType = String(headers['x-module-type'] || body?.module_type || '').trim();
  const formatCode = String(headers['x-format-code'] || body?.format_code || '').trim();

  return {
    billboardId: Number(billboardIdValue),
    moduleType,
    formatCode,
    rawText,
    contentType: String(headers['content-type'] || '')
  };
}

function getPublicBaseUrl(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || String(req.headers.host || '').trim();
  const protocol = forwardedProto || req.protocol || 'http';
  return `${protocol}://${host}`;
}

function normalizeStringArray(values, allowedValues) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(
    values
      .map(value => String(value || '').trim())
      .filter(value => value && allowedValues.includes(value))
  )];
}

function normalizeDisplaySettings(input) {
  let settings = input;

  if (typeof settings === 'string') {
    try {
      settings = JSON.parse(settings);
    } catch (error) {
      settings = {};
    }
  }

  if (!settings || typeof settings !== 'object') {
    settings = {};
  }

  const hiddenColumnsInput = settings.hiddenColumns && typeof settings.hiddenColumns === 'object'
    ? settings.hiddenColumns
    : {};

  return {
    hiddenModules: normalizeStringArray(settings.hiddenModules, ALLOWED_MODULES),
    hiddenColumnGroups: normalizeStringArray(settings.hiddenColumnGroups, ALLOWED_COLUMN_GROUPS),
    hiddenColumns: {
      queue: normalizeStringArray(hiddenColumnsInput.queue, ALLOWED_REGULAR_COLUMNS.queue),
      quality: normalizeStringArray(hiddenColumnsInput.quality, ALLOWED_REGULAR_COLUMNS.quality),
      logistics: normalizeStringArray(hiddenColumnsInput.logistics, ALLOWED_LOGISTICS_COLUMNS)
    }
  };
}

async function writeInboundLog(payload) {
  const result = await db.prepare(`
    INSERT INTO inbound_message_logs
      (source, billboard_id, module_type, format_code, content_type, client_ip, raw_text, status, result_summary, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payload.source || 'wechat-bot',
    payload.billboard_id || null,
    payload.module_type || null,
    payload.format_code || null,
    payload.content_type || null,
    payload.client_ip || null,
    payload.raw_text || '',
    payload.status,
    payload.result_summary || null,
    payload.error_message || null
  );

  return result.lastInsertRowid;
}

// ==================== 认证接口 ====================

// 登录
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ==================== 告示牌管理接口 ====================

// 获取所有告示牌
app.get('/api/billboards', authenticateToken, async (req, res) => {
  try {
    const billboards = await db.prepare('SELECT * FROM billboards ORDER BY created_at DESC').all();
    res.json({ success: true, data: billboards });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建告示牌
app.post('/api/billboards', authenticateToken, async (req, res) => {
  try {
    const { name, subtitle } = req.body;

    if (!name) {
      return res.status(400).json({ error: '告示牌名称不能为空' });
    }

    const subtitleValue = subtitle || '实时更新 | 准确可靠';
    const result = await db.prepare('INSERT INTO billboards (name, subtitle) VALUES (?, ?)').run(name, subtitleValue);

    res.json({
      success: true,
      data: { id: result.lastInsertRowid, name, subtitle: subtitleValue }
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新告示牌
app.put('/api/billboards/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subtitle } = req.body;

    if (!name) {
      return res.status(400).json({ error: '告示牌名称不能为空' });
    }

    const subtitleValue = subtitle !== undefined ? subtitle : '实时更新 | 准确可靠';
    await db.prepare('UPDATE billboards SET name = ?, subtitle = ?, updated_at = ? WHERE id = ?').run(name, subtitleValue, getLocalDateTime(), id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除告示牌
app.delete('/api/billboards/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await db.prepare('DELETE FROM billboards WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ==================== 数据管理接口 ====================

// 获取告示牌所有数据
app.get('/api/billboards/:id/data', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const billboard = await db.prepare('SELECT * FROM billboards WHERE id = ?').get(id);
    if (!billboard) {
      return res.status(404).json({ error: '告示牌不存在' });
    }

    const queueData = await db.prepare('SELECT * FROM module_queue WHERE billboard_id = ? ORDER BY sort_order').all(id);
    const qualityData = await db.prepare('SELECT * FROM module_quality_price WHERE billboard_id = ? ORDER BY sort_order').all(id);
    const logisticsData = await db.prepare('SELECT * FROM module_logistics WHERE billboard_id = ? ORDER BY sort_order').all(id);
    const queueAds = await db.prepare('SELECT * FROM advertisements WHERE billboard_id = ? AND module_type = ? ORDER BY sort_order').all(id, 'queue');
    const qualityAds = await db.prepare('SELECT * FROM advertisements WHERE billboard_id = ? AND module_type = ? ORDER BY sort_order').all(id, 'quality');
    const logisticsAds = await db.prepare('SELECT * FROM advertisements WHERE billboard_id = ? AND module_type = ? ORDER BY sort_order').all(id, 'logistics');
    const updateTimes = await db.prepare('SELECT * FROM module_update_times WHERE billboard_id = ?').all(id);

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

// 更新排队拉运数据
app.put('/api/billboards/:id/queue', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    // v1.4.5: 读取旧数据，用于保存上次的排队中数据
    const oldData = await db.prepare('SELECT pit_name, queuing FROM module_queue WHERE billboard_id = ?').all(id);
    const oldQueuingMap = {};
    oldData.forEach(item => {
      oldQueuingMap[item.pit_name] = item.queuing;
    });

    // 删除旧数据
    await db.prepare('DELETE FROM module_queue WHERE billboard_id = ?').run(id);

    // 插入新数据，同时保存上次的排队中数据
    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      const previousQueuing = oldQueuingMap[item.pit_name] || null;
      await db.prepare('INSERT INTO module_queue (billboard_id, pit_name, contracted, queuing, called, entered, sort_order, previous_queuing) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, item.pit_name, item.contracted, item.queuing, item.called, item.entered, index, previousQueuing);
    }

    // 更新模块更新时间
    const now = getLocalDateTime();
    await db.exec(`
      INSERT INTO module_update_times (billboard_id, module_type, updated_at)
      VALUES (${id}, 'queue', '${now}')
      ON CONFLICT(billboard_id, module_type)
      DO UPDATE SET updated_at = '${now}'
    `);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新质量/价格数据
app.put('/api/billboards/:id/quality', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, priceExecutionTime } = req.body;

    // 删除旧数据
    await db.prepare('DELETE FROM module_quality_price WHERE billboard_id = ?').run(id);

    // 插入新数据
    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      await db.prepare('INSERT INTO module_quality_price (billboard_id, pit_name, heat_value, ash, sulfur, price, change_value, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, item.pit_name, item.heat_value, item.ash, item.sulfur, item.price, item.change_value, index);
    }

    // v1.4.4: 更新模块更新时间和价格执行时间
    const executionTimeValue = priceExecutionTime || null;
    const now = getLocalDateTime();
    await db.exec(`
      INSERT INTO module_update_times (billboard_id, module_type, updated_at, price_execution_time)
      VALUES (${id}, 'quality', '${now}', ${executionTimeValue ? `'${executionTimeValue.replace(/'/g, "''")}'` : 'NULL'})
      ON CONFLICT(billboard_id, module_type)
      DO UPDATE SET updated_at = '${now}', price_execution_time = ${executionTimeValue ? `'${executionTimeValue.replace(/'/g, "''")}'` : 'NULL'}
    `);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新物流费用数据
app.put('/api/billboards/:id/logistics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    // 删除旧数据
    await db.prepare('DELETE FROM module_logistics WHERE billboard_id = ?').run(id);

    // 插入新数据
    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      await db.prepare('INSERT INTO module_logistics (billboard_id, route_type, from_location, to_location, freight, station_name, station_loading_fee, station_fee, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, item.route_type, item.from_location, item.to_location, item.freight, item.station_name, item.station_loading_fee, item.station_fee, index);
    }

    // 更新模块更新时间
    const now = getLocalDateTime();
    await db.exec(`
      INSERT INTO module_update_times (billboard_id, module_type, updated_at)
      VALUES (${id}, 'logistics', '${now}')
      ON CONFLICT(billboard_id, module_type)
      DO UPDATE SET updated_at = '${now}'
    `);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新广告
app.put('/api/billboards/:id/ads', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleType, data } = req.body;

    // 删除旧广告
    await db.prepare('DELETE FROM advertisements WHERE billboard_id = ? AND module_type = ?').run(id, moduleType);

    // 插入新广告
    if (data && data.length > 0) {
      for (let index = 0; index < data.length; index++) {
        const item = data[index];
        await db.prepare('INSERT INTO advertisements (billboard_id, module_type, content, sort_order) VALUES (?, ?, ?, ?)').run(id, moduleType, item.content, index);
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ==================== 自动填充映射管理接口 ====================

// 获取映射列表
app.get('/api/billboards/:id/autofill-mappings', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { module } = req.query;

    if (!module) {
      return res.status(400).json({ error: '需要指定module参数' });
    }

    const mappings = await db.prepare('SELECT * FROM autofill_mappings WHERE billboard_id = ? AND module_type = ? ORDER BY created_at').all(id, module);

    res.json({ success: true, data: mappings });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 批量创建映射
app.post('/api/billboards/:id/autofill-mappings', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { module, mappings } = req.body;

    if (!module || !mappings || !Array.isArray(mappings)) {
      return res.status(400).json({ error: '参数错误' });
    }

    // 批量插入映射
    for (const mapping of mappings) {
      await db.prepare('INSERT OR REPLACE INTO autofill_mappings (billboard_id, module_type, source_name, display_name) VALUES (?, ?, ?, ?)').run(id, module, mapping.source_name, mapping.display_name);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新单个映射
app.put('/api/billboards/:id/autofill-mappings/:mappingId', authenticateToken, async (req, res) => {
  try {
    const { mappingId } = req.params;
    const { source_name, display_name } = req.body;

    if (!source_name || !display_name) {
      return res.status(400).json({ error: '参数错误' });
    }

    await db.prepare('UPDATE autofill_mappings SET source_name = ?, display_name = ? WHERE id = ?').run(source_name, display_name, mappingId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除单个映射
app.delete('/api/billboards/:id/autofill-mappings/:mappingId', authenticateToken, async (req, res) => {
  try {
    const { mappingId } = req.params;

    await db.prepare('DELETE FROM autofill_mappings WHERE id = ?').run(mappingId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 清空所有映射
app.delete('/api/billboards/:id/autofill-mappings', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { module } = req.query;

    if (!module) {
      return res.status(400).json({ error: '需要指定module参数' });
    }

    await db.prepare('DELETE FROM autofill_mappings WHERE billboard_id = ? AND module_type = ?').run(id, module);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ==================== 机器人入站接口（v1.7.5） ====================

app.post('/api/inbound/autofill', async (req, res) => {
  const requestData = getInboundRequestData(req);
  const clientIp = getRequestClientIp(req);

  try {
    const { billboardId, moduleType, formatCode, rawText, contentType } = requestData;

    if (!Number.isInteger(billboardId) || billboardId <= 0) {
      await writeInboundLog({
        billboard_id: Number.isFinite(billboardId) ? billboardId : null,
        module_type: moduleType || null,
        format_code: formatCode || null,
        content_type: contentType,
        client_ip: clientIp,
        raw_text: rawText || '',
        status: 'invalid_target',
        error_message: 'billboard_id 无效'
      });
      return res.status(400).json({ success: false, status: 'invalid_target', error: 'billboard_id 无效' });
    }

    if (!['queue', 'quality'].includes(moduleType)) {
      await writeInboundLog({
        billboard_id: billboardId,
        module_type: moduleType || null,
        format_code: formatCode || null,
        content_type: contentType,
        client_ip: clientIp,
        raw_text: rawText || '',
        status: 'unsupported_module',
        error_message: 'module_type 仅支持 queue 或 quality'
      });
      return res.status(400).json({ success: false, status: 'unsupported_module', error: 'module_type 仅支持 queue 或 quality' });
    }

    if (!formatCode) {
      await writeInboundLog({
        billboard_id: billboardId,
        module_type: moduleType,
        format_code: null,
        content_type: contentType,
        client_ip: clientIp,
        raw_text: rawText || '',
        status: 'missing_format_code',
        error_message: '缺少 format_code'
      });
      return res.status(400).json({ success: false, status: 'missing_format_code', error: '缺少 format_code' });
    }

    if (!rawText) {
      await writeInboundLog({
        billboard_id: billboardId,
        module_type: moduleType,
        format_code: formatCode,
        content_type: contentType,
        client_ip: clientIp,
        raw_text: '',
        status: 'empty_payload',
        error_message: 'raw_text 不能为空'
      });
      return res.status(400).json({ success: false, status: 'empty_payload', error: 'raw_text 不能为空' });
    }

    const billboard = await db.prepare('SELECT id, name FROM billboards WHERE id = ?').get(billboardId);
    if (!billboard) {
      await writeInboundLog({
        billboard_id: billboardId,
        module_type: moduleType,
        format_code: formatCode,
        content_type: contentType,
        client_ip: clientIp,
        raw_text: rawText,
        status: 'billboard_not_found',
        error_message: '目标告示牌不存在'
      });
      return res.status(404).json({ success: false, status: 'billboard_not_found', error: '目标告示牌不存在' });
    }

    const formatMetadata = getInboundFormatMetadata(moduleType, formatCode);
    if (!formatMetadata) {
      await writeInboundLog({
        billboard_id: billboardId,
        module_type: moduleType,
        format_code: formatCode,
        content_type: contentType,
        client_ip: clientIp,
        raw_text: rawText,
        status: 'unsupported_format',
        error_message: `当前未配置 ${moduleType} 模块格式 ${formatCode} 的元数据`
      });
      return res.status(400).json({
        success: false,
        status: 'unsupported_format',
        error: `当前未配置 ${moduleType} 模块格式 ${formatCode} 的元数据`
      });
    }

    const result = await applyInboundAutofill(db, billboardId, moduleType, formatCode, rawText);
    const messageText = `${formatMetadata.coal_source_name}最新${formatMetadata.content_label}信息`;
    const externalClientUrl = `${getPublicBaseUrl(req)}/client/external.html?id=${billboardId}`;
    const summary = JSON.stringify({
      updatedCount: result.updatedCount || 0,
      unmapped: result.unmapped || [],
      missingRows: result.missingRows || [],
      priceExecutionTime: result.priceExecutionTime || null,
      messageText,
      externalClientUrl
    });

    const logId = await writeInboundLog({
      billboard_id: billboardId,
      module_type: moduleType,
      format_code: formatCode,
      content_type: contentType,
      client_ip: clientIp,
      raw_text: rawText,
      status: 'applied',
      result_summary: summary
    });

    res.json({
      success: true,
      status: 'applied',
      message_text: messageText,
      external_client_url: externalClientUrl,
      log_id: logId,
      billboard_id: billboardId,
      billboard_name: billboard.name,
      module_type: moduleType,
      format_code: formatCode,
      updated_count: result.updatedCount || 0,
      unmapped_sources: result.unmapped || [],
      missing_rows: result.missingRows || [],
      price_execution_time: result.priceExecutionTime || null
    });
  } catch (error) {
    const status = error.message.includes('格式') ? 'unsupported_format' : 'parse_or_apply_failed';
    const logId = await writeInboundLog({
      billboard_id: Number.isInteger(requestData.billboardId) ? requestData.billboardId : null,
      module_type: requestData.moduleType || null,
      format_code: requestData.formatCode || null,
      content_type: requestData.contentType || null,
      client_ip: clientIp,
      raw_text: requestData.rawText || '',
      status,
      error_message: error.message
    });

    res.status(status === 'unsupported_format' ? 400 : 500).json({
      success: false,
      status,
      log_id: logId,
      error: error.message
    });
  }
});

// ==================== 客户端接口 ====================

app.put('/api/client/billboards/:id/display-settings', async (req, res) => {
  try {
    const { id } = req.params;
    const billboard = await db.prepare('SELECT id FROM billboards WHERE id = ?').get(id);

    if (!billboard) {
      return res.status(404).json({ success: false, error: '告示牌不存在' });
    }

    const displaySettings = normalizeDisplaySettings(req.body?.display_settings);
    await db.prepare('UPDATE billboards SET display_settings = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(displaySettings),
      getLocalDateTime(),
      id
    );

    res.json({
      success: true,
      data: displaySettings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 获取告示牌展示数据（无需认证）
app.get('/api/client/billboards/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const billboard = await db.prepare('SELECT * FROM billboards WHERE id = ?').get(id);
    if (!billboard) {
      return res.status(404).json({ error: '告示牌不存在' });
    }

    const queueData = await db.prepare('SELECT * FROM module_queue WHERE billboard_id = ? ORDER BY sort_order').all(id);
    const qualityData = await db.prepare('SELECT * FROM module_quality_price WHERE billboard_id = ? ORDER BY sort_order').all(id);
    const logisticsData = await db.prepare('SELECT * FROM module_logistics WHERE billboard_id = ? ORDER BY sort_order').all(id);
    const queueAds = await db.prepare('SELECT * FROM advertisements WHERE billboard_id = ? AND module_type = ? ORDER BY sort_order').all(id, 'queue');
    const qualityAds = await db.prepare('SELECT * FROM advertisements WHERE billboard_id = ? AND module_type = ? ORDER BY sort_order').all(id, 'quality');
    const logisticsAds = await db.prepare('SELECT * FROM advertisements WHERE billboard_id = ? AND module_type = ? ORDER BY sort_order').all(id, 'logistics');
    const updateTimes = await db.prepare('SELECT * FROM module_update_times WHERE billboard_id = ?').all(id);

    const updateTimesMap = {};
    updateTimes.forEach(item => {
      updateTimesMap[item.module_type] = {
        updated_at: item.updated_at,
        price_execution_time: item.price_execution_time || null
      };
    });

    billboard.display_settings = normalizeDisplaySettings(billboard.display_settings);

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
        updateTimes: updateTimesMap
      }
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
