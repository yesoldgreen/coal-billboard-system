#!/bin/bash

# 煤矿内参告示牌系统启动脚本

echo "========================================"
echo "煤矿内参告示牌系统 - 启动脚本"
echo "========================================"

mkdir -p logs

# 检查是否安装了依赖
check_dependencies() {
    local dir=$1
    if [ ! -d "$dir/node_modules" ]; then
        echo "正在安装 $dir 的依赖..."
        cd "$dir"
        npm install
        cd ..
    fi
}

echo "检查依赖..."
check_dependencies "backend"

echo ""
echo "启动服务..."
echo ""

# 启动后端
echo "1. 启动后端服务 (端口 3000)..."
cd backend
npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "服务启动成功！"
echo "========================================"
echo "后端服务:   http://localhost:3000"
echo "后台管理:   http://localhost:3000/admin/"
echo "客户端:     http://localhost:3000/client/index.html?id=1"
echo "========================================"
echo "登录账号: hulianshikong"
echo "登录密码: hlsk2026"
echo "========================================"
echo ""
echo "进程 ID:"
echo "  后端: $BACKEND_PID"
echo ""
echo "停止服务: kill $BACKEND_PID"
echo "或执行: ./stop-all.sh"
echo ""

# 保存进程 ID
echo "$BACKEND_PID" > .pids
