# Vercel部署指南 - v1.5

## 已完成
- ✅ PostgreSQL数据库层(`lib/database.js`)
- ✅ 数据库初始化脚本(`lib/init-db.js`)
- ✅ 认证中间件(`lib/auth.js`)
- ✅ Vercel配置(`vercel.json`)
- ✅ 示例API：
  - `/api/admin/login.js`
  - `/api/client/billboards/[id].js`

## 需要完成的API（从backend/server.js迁移）

### 管理端API (需认证)
- `/api/billboards/index.js` - GET获取列表
- `/api/billboards/create.js` - POST创建
- `/api/billboards/[id]/index.js` - PUT/DELETE编辑/删除
- `/api/billboards/[id]/data.js` - GET获取数据
- `/api/billboards/[id]/queue.js` - PUT更新排队数据
- `/api/billboards/[id]/quality.js` - PUT更新质量价格
- `/api/billboards/[id]/logistics.js` - PUT更新物流
- `/api/billboards/[id]/ads.js` - PUT更新广告
- `/api/billboards/[id]/autofill-mappings/index.js` - GET/POST/DELETE映射
- `/api/billboards/[id]/autofill-mappings/[mappingId].js` - PUT/DELETE单个映射

## 部署步骤

### 1. 创建Vercel项目
```bash
vercel
```

### 2. 添加Vercel Postgres数据库
在Vercel控制台：Storage → Create Database → Postgres

### 3. 连接数据库到项目
选择项目 → 连接，环境变量自动注入

### 4. 初始化数据库
```bash
npm run init-db
```

### 5. 设置环境变量
在Vercel项目设置中添加：
- `JWT_SECRET`: 随机字符串

### 6. 部署
```bash
git push
```

## 本地开发
```bash
npm install
vercel env pull  # 拉取环境变量
vercel dev       # 本地运行
```

## SQL语法变化
- SQLite → PostgreSQL
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
- `DATETIME` → `TIMESTAMP`
- `?` 占位符 → `$1, $2, ...`
- 删除了PRAGMA兼容性检查
