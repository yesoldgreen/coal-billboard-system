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
├── admin-frontend/                   # 后台管理系统
│   ├── public/                      # 公共资源
│   │   └── index.html              # HTML模板
│   ├── src/                         # 源代码
│   │   ├── components/             # React组件
│   │   │   ├── BillboardList.js   # 告示牌列表组件
│   │   │   ├── BillboardEditor.js # 告示牌编辑器
│   │   │   ├── QueueEditor.js     # 排队拉运编辑器
│   │   │   ├── QualityEditor.js   # 质量/价格编辑器
│   │   │   └── LogisticsEditor.js # 物流费用编辑器
│   │   ├── pages/                  # 页面组件
│   │   │   ├── Login.js           # 登录页面
│   │   │   ├── Login.css          # 登录页面样式
│   │   │   ├── Dashboard.js       # 主控制台
│   │   │   └── Dashboard.css      # 主控制台样式
│   │   ├── App.js                  # 应用根组件
│   │   ├── api.js                  # API接口封装
│   │   ├── index.js                # 入口文件
│   │   └── index.css               # 全局样式
│   ├── .env                         # 环境变量配置
│   └── package.json                 # 前端依赖配置
│
├── client-frontend/                  # 客户端展示系统
│   ├── public/                      # 公共资源
│   │   └── index.html              # HTML模板
│   ├── src/                         # 源代码
│   │   ├── pages/                  # 页面组件
│   │   │   ├── Billboard.js       # 告示牌展示页面
│   │   │   └── Billboard.css      # 告示牌样式
│   │   ├── App.js                  # 应用根组件
│   │   ├── index.js                # 入口文件
│   │   └── index.css               # 全局样式
│   ├── .env                         # 环境变量配置
│   └── package.json                 # 前端依赖配置
│
├── logs/                             # 日志目录（运行后生成）
│   ├── backend.log                  # 后端日志
│   ├── admin.log                    # 后台管理日志
│   └── client.log                   # 客户端日志
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

### admin-frontend/ - 后台管理系统

后台管理使用 React + Ant Design 构建。

**组件说明**:
- `Login.js`: 登录页面，使用 Ant Design 表单组件
- `Dashboard.js`: 主控制台，包含侧边栏导航和路由
- `BillboardList.js`: 告示牌列表，支持创建、修改、删除、复制链接
- `BillboardEditor.js`: 告示牌编辑器，使用Tab切换不同模块
- `QueueEditor.js`: 排队拉运数据编辑器，表格形式录入
- `QualityEditor.js`: 质量/价格数据编辑器，表格形式录入
- `LogisticsEditor.js`: 物流费用数据编辑器，支持直运和集运站

**路由结构**:
- `/login` - 登录页面
- `/` - 告示牌列表
- `/billboard/:id` - 告示牌编辑页面

### client-frontend/ - 客户端展示系统

客户端使用 React + 自定义CSS 构建，完全还原设计图样式。

**组件说明**:
- `Billboard.js`: 告示牌展示页面
  - 自动轮询数据（30秒）
  - 响应式设计
  - 显示更新时间
  - 支持广告展示

**页面结构**:
- 顶栏：Logo + 告示牌标题
- 模块1：排队拉运（蓝色主题）
- 模块2：质量/价格（绿色主题）
- 模块3：物流费用（橙色主题）
- 底栏：联系方式 + 二维码（灰色主题）

**路由结构**:
- `/billboard/:id` - 告示牌展示页面
- `/` - 默认提示页面

## 数据流向

```
用户操作后台管理
    ↓
后台管理发送API请求
    ↓
后端服务处理请求
    ↓
更新SQLite数据库
    ↓
客户端定时轮询API
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

### 前端（后台管理）
- **React 18**: UI框架
- **React Router**: 路由管理
- **Ant Design 5**: UI组件库
- **Axios**: HTTP客户端

### 前端（客户端）
- **React 18**: UI框架
- **React Router**: 路由管理
- **Axios**: HTTP客户端
- **自定义CSS**: 样式实现

## 开发规范

### 代码组织
- 组件采用函数式组件 + Hooks
- API调用统一在 `api.js` 中封装
- 样式文件与组件文件同名

### 命名规范
- 组件文件: PascalCase (如 `BillboardList.js`)
- 普通文件: camelCase (如 `database.js`)
- CSS类名: kebab-case (如 `.billboard-container`)

### 状态管理
- 使用 React Hooks (useState, useEffect)
- 局部状态管理，无全局状态库

### API设计
- RESTful风格
- 统一响应格式：`{ success: true, data: {...} }`
- 使用 HTTP 状态码表示请求结果

## 扩展开发

### 添加新模块
1. 在数据库中添加新表（`database.js`）
2. 在后端添加API端点（`server.js`）
3. 在后台管理添加编辑器组件
4. 在客户端添加展示组件

### 自定义样式
- 修改 `client-frontend/src/pages/Billboard.css`
- 调整颜色、字体、布局等

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
