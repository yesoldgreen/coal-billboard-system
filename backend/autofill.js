const INBOUND_FORMAT_METADATA = {
  quality: {
    '2001': {
      coal_source_name: '汇能长滩煤矿',
      content_label: '价格'
    },
    '2002': {
      coal_source_name: '白家海子煤矿',
      content_label: '价格'
    }
  }
};

function normalizeQualitySourceName(name) {
  return (name || '').replace(/^汇能/, '').trim();
}

function normalizeQualityAutofillText(text) {
  return (text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/：/g, ':')
    .replace(/；/g, ';')
    .replace(/(\d)\s*\n\s*(元\/吨)/g, '$1$2')
    .replace(/执行\s*\n\s*(\d+)/g, '执行$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function extractQualityExecutionTime(text) {
  const compactText = text.replace(/\n/g, ' ');
  const match = compactText.match(/[自从]\s*([\s\S]{0,80}?起(?:\([^)]*\))?)(?=(?:价格执行如下|各煤种含税价格调整如下|，各煤种含税价格调整如下|,各煤种含税价格调整如下|。|:))/);
  return match ? match[1].trim() : '';
}

function parseQueueText(text) {
  const lines = (text || '').split('\n').filter(line => line.trim());
  const items = [];
  const regex = /^(.+?)\s*[:：]\s*(\d+)\s*$/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      items.push({
        source_name: match[1].trim(),
        value: match[2].trim()
      });
    }
  }

  return { items };
}

function parseQualityPriceNoticeTemplate(text) {
  const compactText = text.replace(/\n/g, ' ');
  const regex = /\d+[、.]\s*([^。；;]*?)执行\s*(\d+)\s*元\/吨(?:[。；;]?\s*\(\s*([↑↓+\-])\s*(\d+)\s*元\/吨\s*\))?/g;
  const items = [];
  let match;

  while ((match = regex.exec(compactText)) !== null) {
    const rawName = match[1].trim();
    const sourceName = normalizeQualitySourceName(rawName);
    const price = match[2].trim();
    const direction = match[3] || '';
    const deltaValue = match[4] || '';
    const changeValue = deltaValue ? `${direction === '↓' ? '-' : '+'}${deltaValue}` : '0';

    if (!sourceName || !price) continue;

    items.push({
      source_name: sourceName,
      raw_name: rawName,
      price,
      change_value: changeValue
    });
  }

  return {
    priceExecutionTime: extractQualityExecutionTime(text),
    items
  };
}

function parseQualityText(text) {
  const normalizedText = normalizeQualityAutofillText(text);
  const parserResults = [parseQualityPriceNoticeTemplate(normalizedText)];
  const mergedItems = [];
  let priceExecutionTime = '';

  parserResults.forEach(result => {
    if (result.priceExecutionTime && !priceExecutionTime) {
      priceExecutionTime = result.priceExecutionTime;
    }

    result.items.forEach(item => {
      if (!mergedItems.find(existing => existing.source_name === item.source_name)) {
        mergedItems.push(item);
      }
    });
  });

  return {
    priceExecutionTime,
    items: mergedItems
  };
}

function parseInboundText(moduleType, formatCode, rawText) {
  if (moduleType === 'queue') {
    const parsed = parseQueueText(rawText);
    if (parsed.items.length === 0) {
      throw new Error('未识别到有效的排队拉运数据');
    }
    return parsed;
  }

  if (moduleType === 'quality') {
    if (!['2001', '2002'].includes(String(formatCode))) {
      throw new Error(`当前不支持质量/价格模块格式 ${formatCode}`);
    }

    const parsed = parseQualityText(rawText);
    if (parsed.items.length === 0 && !parsed.priceExecutionTime) {
      throw new Error('未识别到有效的质量/价格数据');
    }
    return parsed;
  }

  throw new Error(`当前不支持模块 ${moduleType}`);
}

function getInboundFormatMetadata(moduleType, formatCode) {
  const moduleMetadata = INBOUND_FORMAT_METADATA[moduleType];
  if (!moduleMetadata) return null;
  return moduleMetadata[String(formatCode)] || null;
}

async function applyQueueAutofill(db, billboardId, parsed) {
  const mappings = await db.prepare('SELECT * FROM autofill_mappings WHERE billboard_id = ? AND module_type = ? ORDER BY created_at').all(billboardId, 'queue');
  const mappingMap = {};
  mappings.forEach(item => {
    mappingMap[item.source_name] = item.display_name;
  });

  const currentRows = await db.prepare('SELECT * FROM module_queue WHERE billboard_id = ? ORDER BY sort_order').all(billboardId);
  const currentRowMap = {};
  currentRows.forEach(row => {
    currentRowMap[row.pit_name] = row;
  });

  let updatedCount = 0;
  const unmapped = [];

  parsed.items.forEach(item => {
    const displayName = mappingMap[item.source_name];
    if (!displayName) {
      unmapped.push(item.source_name);
      return;
    }

    const row = currentRowMap[displayName];
    if (!row) {
      unmapped.push(item.source_name);
      return;
    }

    row.queuing = item.value;
    updatedCount += 1;
  });

  if (updatedCount > 0) {
    const oldRows = await db.prepare('SELECT pit_name, queuing FROM module_queue WHERE billboard_id = ?').all(billboardId);
    const oldQueuingMap = {};
    oldRows.forEach(item => {
      oldQueuingMap[item.pit_name] = item.queuing;
    });

    await db.prepare('DELETE FROM module_queue WHERE billboard_id = ?').run(billboardId);
    for (let index = 0; index < currentRows.length; index += 1) {
      const item = currentRows[index];
      const previousQueuing = oldQueuingMap[item.pit_name] || null;
      await db.prepare('INSERT INTO module_queue (billboard_id, pit_name, contracted, queuing, called, entered, sort_order, previous_queuing) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        billboardId,
        item.pit_name,
        item.contracted,
        item.queuing,
        item.called,
        item.entered,
        index,
        previousQueuing
      );
    }
  }

  return {
    updatedCount,
    unmapped,
    missingMappings: unmapped
  };
}

async function applyQualityAutofill(db, billboardId, parsed) {
  const mappings = await db.prepare('SELECT * FROM autofill_mappings WHERE billboard_id = ? AND module_type = ? ORDER BY created_at').all(billboardId, 'quality');
  const mappingMap = {};
  mappings.forEach(item => {
    mappingMap[item.source_name] = item.display_name;
  });

  const currentRows = await db.prepare('SELECT * FROM module_quality_price WHERE billboard_id = ? ORDER BY sort_order').all(billboardId);
  const currentRowMap = {};
  currentRows.forEach(row => {
    currentRowMap[row.pit_name] = row;
  });

  let updatedCount = 0;
  const unmapped = [];
  const missingRows = [];

  parsed.items.forEach(item => {
    const displayName = mappingMap[item.source_name];
    if (!displayName) {
      unmapped.push(item.source_name);
      return;
    }

    const row = currentRowMap[displayName];
    if (!row) {
      missingRows.push(item.source_name);
      return;
    }

    row.price = item.price;
    row.change_value = item.change_value;
    updatedCount += 1;
  });

  if (updatedCount > 0) {
    await db.prepare('DELETE FROM module_quality_price WHERE billboard_id = ?').run(billboardId);
    for (let index = 0; index < currentRows.length; index += 1) {
      const item = currentRows[index];
      await db.prepare('INSERT INTO module_quality_price (billboard_id, pit_name, heat_value, ash, sulfur, price, change_value, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        billboardId,
        item.pit_name,
        item.heat_value,
        item.ash,
        item.sulfur,
        item.price,
        item.change_value,
        index
      );
    }
  }

  return {
    updatedCount,
    priceExecutionTime: parsed.priceExecutionTime || null,
    unmapped,
    missingRows
  };
}

async function updateModuleTimestamp(db, billboardId, moduleType, priceExecutionTime) {
  const now = new Date();
  const timeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const escapedExecutionTime = priceExecutionTime ? `'${String(priceExecutionTime).replace(/'/g, "''")}'` : 'NULL';

  if (moduleType === 'quality') {
    await db.exec(`
      INSERT INTO module_update_times (billboard_id, module_type, updated_at, price_execution_time)
      VALUES (${billboardId}, 'quality', '${timeString}', ${escapedExecutionTime})
      ON CONFLICT(billboard_id, module_type)
      DO UPDATE SET updated_at = '${timeString}', price_execution_time = ${escapedExecutionTime}
    `);
    return;
  }

  await db.exec(`
    INSERT INTO module_update_times (billboard_id, module_type, updated_at)
    VALUES (${billboardId}, '${moduleType}', '${timeString}')
    ON CONFLICT(billboard_id, module_type)
    DO UPDATE SET updated_at = '${timeString}'
  `);
}

async function applyInboundAutofill(db, billboardId, moduleType, formatCode, rawText) {
  const parsed = parseInboundText(moduleType, formatCode, rawText);
  let result;

  if (moduleType === 'queue') {
    result = await applyQueueAutofill(db, billboardId, parsed);
    await updateModuleTimestamp(db, billboardId, 'queue', null);
    return { moduleType, formatCode, parsed, ...result };
  }

  if (moduleType === 'quality') {
    result = await applyQualityAutofill(db, billboardId, parsed);
    await updateModuleTimestamp(db, billboardId, 'quality', result.priceExecutionTime || null);
    return { moduleType, formatCode, parsed, ...result };
  }

  throw new Error(`当前不支持模块 ${moduleType}`);
}

module.exports = {
  parseQueueText,
  parseQualityText,
  parseInboundText,
  applyInboundAutofill,
  getInboundFormatMetadata
};
