# 煤矿内参告示牌系统

一个完整的煤矿内参告示牌管理和展示系统，包含后台管理和客户端展示功能。

## 系统架构

- **后端服务**: Node.js + Express + SQLite
- **后台管理**: 后端托管的静态 HTML 页面
- **客户端展示**: 后端托管的静态 HTML 页面

## 功能特性

### 后台管理功能
- 用户登录认证
- 创建、修改、删除告示牌
- 编辑告示牌数据（排队拉运、质量/价格、物流费用）
- 管理广告信息
- 自动记录数据更新时间

### 客户端展示功能
- 实时展示告示牌数据
- 自动更新（30秒轮询）
- 显示各模块更新时间
- 提供对内客户端与对外客户端两种访问方式
- 支持按告示牌分别保存隐藏状态
- 响应式设计，支持移动端

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 启动服务

#### 启动后端服务
```bash
cd backend
npm start
# 服务运行在 http://localhost:3000
```

### 3. 访问系统

- **后台管理**: http://localhost:3000/admin/
  - 用户名: `hulianshikong`
  - 密码: `hlsk2026`

- **对外客户端**: http://localhost:3000/client/external.html?id={告示牌ID}
- **对内客户端**: http://localhost:3000/client/index.html?id={告示牌ID}

## 使用说明

### 后台管理操作流程

1. 使用账号密码登录后台
2. 点击"创建告示牌"，输入告示牌名称（如：汇能长滩 煤矿内参）
3. 在列表中点击"编辑数据"进入数据编辑页面
4. 分别编辑三个模块的数据：
   - **排队拉运**: 添加坑口、已磨约、排队中、已叫号、已入场数据
   - **质量/价格**: 添加坑口、热值、灰分、硫、含税价格、变动数据
   - **物流费用**: 添加直运或集运站的物流费用信息
5. 每个模块可以添加广告信息
6. 点击后台里的复制链接，分别获取对外客户端和对内客户端访问链接

### 客户端展示

- 对外客户端用于付费用户查看，只展示数据和已保存的隐藏状态
- 对内客户端用于运营人员调整显示布局和保存隐藏状态
- 数据每30秒自动刷新
- 各模块显示最后更新时间
- 对内客户端可先临时隐藏模块或列，再点击页面底部“隐藏保存”按钮保存当前隐藏状态
- 对外客户端会忠实映射对内客户端已保存的隐藏状态，但不提供任何隐藏/恢复/保存入口
- 支持手机浏览器访问

## 数据库说明

系统使用 SQLite 数据库，数据文件位于 `backend/billboard.db`

### 数据表结构

- `users`: 用户表
- `billboards`: 告示牌表
- `module_queue`: 排队拉运数据
- `module_quality_price`: 质量/价格数据
- `module_logistics`: 物流费用数据
- `advertisements`: 广告表
- `module_update_times`: 模块更新时间表

## 核心规则

1. **实时更新**: 后台更新数据后，客户端会在下次轮询时自动更新
2. **更新时间**: 每次更新模块数据，都会记录并显示更新时间
3. **对外映射**: 对外客户端读取与对内客户端相同的数据和隐藏配置，但自身不可修改隐藏状态
4. **无历史数据**: 系统不保留历史数据，每次更新会覆盖之前的数据

## API 接口

### 管理接口（需要认证）
- `POST /api/admin/login` - 登录
- `GET /api/billboards` - 获取所有告示牌
- `POST /api/billboards` - 创建告示牌
- `PUT /api/billboards/:id` - 更新告示牌
- `DELETE /api/billboards/:id` - 删除告示牌
- `GET /api/billboards/:id/data` - 获取告示牌数据
- `PUT /api/billboards/:id/queue` - 更新排队拉运数据
- `PUT /api/billboards/:id/quality` - 更新质量/价格数据
- `PUT /api/billboards/:id/logistics` - 更新物流费用数据
- `PUT /api/billboards/:id/ads` - 更新广告

### 客户端接口（无需认证）
- `GET /api/client/billboards/:id` - 获取告示牌展示数据
- `PUT /api/client/billboards/:id/display-settings` - 保存当前告示牌的隐藏显示配置

## 技术栈版本

- Node.js >= 14.x
- Express 4.x
- sqlite3 5.x
- 原生 HTML/CSS/JavaScript

## 注意事项

1. 首次启动时会自动创建数据库和默认用户
2. 客户端链接中的告示牌ID对应数据库中的告示牌ID
3. 对外客户端默认地址为 `/client/external.html?id={告示牌ID}`，对内客户端地址为 `/client/index.html?id={告示牌ID}`
4. 广告内容支持自定义，留空则不显示
5. 底栏（二维码区域）目前为静态展示，暂不支持后台修改
6. 建议在生产环境中：
   - 修改 JWT 密钥（server.js 中的 SECRET_KEY）
   - 使用 HTTPS 协议
   - 配置 CORS 白名单
   - 使用 PM2 等进程管理工具

## 开发模式

在开发模式下，可以使用 nodemon 自动重启后端服务：

```bash
cd backend
npm run dev
```

## 生产部署

### 后端部署
```bash
cd backend
npm install --production
node server.js
```

静态页面文件位于 `public/admin` 和 `public/client`，由后端直接托管。

## 故障排查

1. **数据库连接错误**: 检查 backend 目录权限
2. **跨域问题**: 检查后端 CORS 配置
3. **端口占用**: 确保 3000 端口未被占用
4. **数据不更新**: 检查浏览器控制台网络请求

## 许可证

MIT License

## 联系方式

如有问题，请联系系统管理员。
