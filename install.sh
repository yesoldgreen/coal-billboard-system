#!/bin/bash

# 煤矿内参告示牌系统安装脚本

echo "========================================"
echo "煤矿内参告示牌系统 - 安装脚本"
echo "========================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未检测到 Node.js，请先安装 Node.js (>= 14.x)"
    exit 1
fi

echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"
echo ""

# 创建日志目录
mkdir -p logs

# 安装后端依赖
echo "1. 安装后端依赖..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "错误: 后端依赖安装失败"
    exit 1
fi
cd ..
echo "✓ 后端依赖安装完成"
echo ""

echo "========================================"
echo "安装完成！"
echo "========================================"
echo ""
echo "使用以下命令启动系统："
echo "  ./start-all.sh"
echo ""
echo "或者直接启动后端服务："
echo "  cd backend && npm start"
echo ""
echo "访问地址："
echo "  后台管理: http://localhost:3000/admin/"
echo "  客户端:   http://localhost:3000/client/index.html?id=1"
echo ""
