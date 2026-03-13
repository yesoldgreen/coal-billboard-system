#!/bin/bash

# 煤矿内参告示牌系统停止脚本

echo "停止所有服务..."

if [ -f .pids ]; then
    while read pid; do
        if ps -p $pid > /dev/null; then
            echo "停止进程 $pid"
            kill $pid
        fi
    done < .pids
    rm .pids
    echo "所有服务已停止"
else
    echo "未找到运行的服务"
fi
