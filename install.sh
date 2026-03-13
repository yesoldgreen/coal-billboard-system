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

# 安装后台管理依赖
echo "2. 安装后台管理依赖..."
cd admin-frontend
npm install
if [ $? -ne 0 ]; then
    echo "错误: 后台管理依赖安装失败"
    exit 1
fi
cd ..
echo "✓ 后台管理依赖安装完成"
echo ""

# 安装客户端依赖
echo "3. 安装客户端依赖..."
cd client-frontend
npm install
if [ $? -ne 0 ]; then
    echo "错误: 客户端依赖安装失败"
    exit 1
fi
cd ..
echo "✓ 客户端依赖安装完成"
echo ""

echo "========================================"
echo "安装完成！"
echo "========================================"
echo ""
echo "使用以下命令启动系统："
echo "  ./start-all.sh"
echo ""
echo "或者分别启动各个服务："
echo "  cd backend && npm start"
echo "  cd admin-frontend && PORT=3001 npm start"
echo "  cd client-frontend && PORT=3002 npm start"
echo ""
