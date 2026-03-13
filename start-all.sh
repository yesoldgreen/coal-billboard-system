#!/bin/bash

# 煤矿内参告示牌系统启动脚本

echo "========================================"
echo "煤矿内参告示牌系统 - 启动脚本"
echo "========================================"

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
check_dependencies "admin-frontend"
check_dependencies "client-frontend"

echo ""
echo "启动服务..."
echo ""

# 启动后端
echo "1. 启动后端服务 (端口 3000)..."
cd backend
npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动后台管理
echo "2. 启动后台管理 (端口 3001)..."
cd admin-frontend
PORT=3001 npm start > ../logs/admin.log 2>&1 &
ADMIN_PID=$!
cd ..

# 等待管理端启动
sleep 3

# 启动客户端
echo "3. 启动客户端 (端口 3002)..."
cd client-frontend
PORT=3002 npm start > ../logs/client.log 2>&1 &
CLIENT_PID=$!
cd ..

echo ""
echo "========================================"
echo "所有服务启动成功！"
echo "========================================"
echo "后端服务:   http://localhost:3000"
echo "后台管理:   http://localhost:3001"
echo "客户端:     http://localhost:3002"
echo "========================================"
echo "登录账号: hulianshikong"
echo "登录密码: hlsk2026"
echo "========================================"
echo ""
echo "进程 ID:"
echo "  后端: $BACKEND_PID"
echo "  管理: $ADMIN_PID"
echo "  客户端: $CLIENT_PID"
echo ""
echo "停止服务: kill $BACKEND_PID $ADMIN_PID $CLIENT_PID"
echo "或执行: ./stop-all.sh"
echo ""

# 保存进程 ID
echo "$BACKEND_PID" > .pids
echo "$ADMIN_PID" >> .pids
echo "$CLIENT_PID" >> .pids
