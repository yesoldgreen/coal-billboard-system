# 项目结构说明

```
coal-billboard-system/
│
├── backend/                          # 后端服务
│   ├── server.js                    # Express服务器主文件
│   ├── database.js                  # 数据库初始化和配置
│   ├── package.json                 # 后端依赖配置
│   └── billboard.db                 # SQLite数据库文件（运行后生成）
│
├── public/
│   ├── admin/                       # 后台管理静态页面
│   │   ├── index.html              # 后台首页
│   │   ├── editor.html             # 数据编辑页
│   │   └── editor-v1.0-backup.html # 历史备份
│   └── client/                      # 客户端展示静态页面
│       ├── index.html              # 客户端页面
│       └── index-*.html            # 历史备份
│
├── logs/                             # 日志目录（运行后生成）
│   └── backend.log                  # 后端日志
│
├── README.md                         # 项目说明文档
├── QUICKSTART.md                     # 快速入门指南
├── STRUCTURE.md                      # 项目结构说明（本文件）
├── .gitignore                        # Git忽略配置
├── install.sh                        # 安装脚本
├── start-all.sh                      # 启动脚本
└── stop-all.sh                       # 停止脚本
```

## 各目录详细说明

### backend/ - 后端服务

后端使用 Node.js + Express + SQLite 构建，提供 RESTful API。

**核心文件**:
- `server.js`: Express服务器配置、路由定义、API实现
- `database.js`: SQLite数据库初始化、表结构创建

**数据库表结构**:
1. `users` - 用户表（存储管理员账号）
2. `billboards` - 告示牌表（存储告示牌基本信息）
3. `module_queue` - 排队拉运数据表
4. `module_quality_price` - 质量/价格数据表
5. `module_logistics` - 物流费用数据表
6. `advertisements` - 广告表
7. `module_update_times` - 模块更新时间表

**API端点**:
- 认证: `/api/admin/login`
- 告示牌管理: `/api/billboards/*`
- 数据管理: `/api/billboards/:id/{queue,quality,logistics,ads}`
- 客户端: `/api/client/billboards/:id`

### public/admin/ - 后台管理系统

后台管理由后端直接托管的静态页面组成。

**页面说明**:
- `index.html`: 登录、告示牌列表、创建/改名/删除入口
- `editor.html`: 三个模块的数据编辑页

### public/client/ - 客户端展示系统

客户端由后端直接托管的静态页面组成。

**页面说明**:
- `index.html`: 告示牌展示页面
  - 自动轮询数据（30秒）
  - 响应式设计
  - 显示更新时间
  - 支持广告展示

## 数据流向

```
用户打开 /admin/
    ↓
后台静态页面发送 API 请求
    ↓
后端服务处理请求
    ↓
更新 SQLite 数据库
    ↓
客户端静态页面定时轮询 API
    ↓
获取最新数据
    ↓
客户端页面更新
```

## 技术栈

### 后端
- **Node.js**: JavaScript运行时
- **Express**: Web应用框架
- **better-sqlite3**: SQLite数据库驱动
- **bcryptjs**: 密码加密
- **jsonwebtoken**: JWT认证
- **cors**: 跨域支持

### 前端（后台管理与客户端）
- **原生 HTML**: 页面结构
- **原生 CSS**: 界面样式
- **原生 JavaScript**: 交互逻辑和 API 调用

## 开发规范

### 代码组织
- 静态页面按后台端和客户端拆分
- API 调用直接在页面脚本中发起
- 页面与样式内聚在对应 HTML 文件

### 命名规范
- 普通文件: camelCase (如 `database.js`)
- CSS类名: kebab-case (如 `.billboard-container`)

### 状态管理
- 页面内局部状态
- 通过浏览器 `localStorage` 保存登录态

### API设计
- RESTful风格
- 统一响应格式：`{ success: true, data: {...} }`
- 使用 HTTP 状态码表示请求结果

## 扩展开发

### 添加新模块
1. 在数据库中添加新表（`database.js`）
2. 在后端添加API端点（`server.js`）
3. 在 `public/admin` 中补充管理页面逻辑
4. 在 `public/client` 中补充展示页面逻辑

### 自定义样式
- 修改 `public/admin/index.html`、`public/admin/editor.html`
- 修改 `public/client/index.html`

### 添加新功能
- 用户权限管理
- 数据导入/导出
- 历史数据记录
- 多语言支持
- 移动端App

## 性能优化建议

### 后端
- 添加数据库索引
- 实现缓存机制（Redis）
- 使用连接池

### 前端
- 代码分割（React.lazy）
- 图片懒加载
- 虚拟滚动（长列表）
- Service Worker（PWA）

### 部署
- 使用 PM2 管理进程
- Nginx 反向代理
- CDN 加速静态资源
- 启用 gzip 压缩

## 安全建议

1. **认证**: 使用强密码策略，定期更新密码
2. **授权**: 实现基于角色的访问控制
3. **传输**: 生产环境使用 HTTPS
4. **输入验证**: 防止 SQL 注入、XSS 攻击
5. **速率限制**: 防止暴力破解和 DDoS
6. **日志审计**: 记录所有敏感操作

## 故障排查

### 常见问题
1. 端口占用 → 修改 `.env` 文件
2. 依赖安装失败 → 清除缓存重新安装
3. 数据库错误 → 检查文件权限
4. 跨域问题 → 检查 CORS 配置
5. 页面空白 → 检查浏览器控制台错误

### 调试技巧
- 使用浏览器开发者工具
- 查看后端日志文件
- 使用 Postman 测试 API
- 启用详细日志输出

## 维护建议

1. **定期备份**: 备份 `billboard.db` 文件
2. **更新依赖**: 定期检查并更新依赖包
3. **监控日志**: 定期查看日志文件
4. **性能监控**: 监控服务器资源使用
5. **用户反馈**: 收集用户反馈，持续改进

## 版本历史

- **v1.0.0** (2026-02): 初始版本
  - 实现基本的告示牌管理功能
  - 支持三个数据模块
  - 实现实时数据展示
  - 提供完整的管理界面

## 未来计划

- [ ] 支持底栏自定义（上传二维码）
- [ ] 添加数据导出功能（Excel）
- [ ] 实现历史数据记录
- [ ] 添加数据统计图表
- [ ] 移动端原生App
- [ ] 微信小程序版本
- [ ] 多租户支持
- [ ] 更多主题选项

---

如有疑问或需要技术支持，请参考 README.md 或 QUICKSTART.md
