#!/bin/bash

echo "添加 v1.1 测试数据（包含铁路运输）..."

# 获取Token
TOKEN=$(curl -s -X POST https://3000-capy-1772251385994-336037-preview.happycapy.ai/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hulianshikong","password":"hlsk2026"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token获取成功"

# 更新物流费用数据（包含三种类型）
curl -s -X PUT https://3000-capy-1772251385994-336037-preview.happycapy.ai/api/billboards/1/logistics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data": [
      {"route_type":"highway","from_location":"长滩矿","to_location":"邯郸","freight":"120"},
      {"route_type":"highway","from_location":"汇能2号","to_location":"石家庄","freight":"150"},
      {"route_type":"highway","from_location":"长滩矿","to_location":"保定","freight":"180"},
      {"route_type":"station","station_name":"派山集运站","station_loading_fee":"80","station_fee":"15"},
      {"route_type":"station","station_name":"长滩集运站","station_loading_fee":"75","station_fee":"12"},
      {"route_type":"railway","from_location":"长滩站","to_location":"邯郸站","freight":"200"},
      {"route_type":"railway","from_location":"汇能站","to_location":"石家庄站","freight":"230"}
    ]
  }'

echo ""
echo "✅ v1.1 测试数据添加成功！"
echo ""
echo "包含："
echo "  - 3条公路运输数据"
echo "  - 2条集运站数据"
echo "  - 2条铁路运输数据"
echo ""
echo "请访问以下地址查看效果："
echo "后台管理: https://3000-capy-1772251385994-336037-preview.happycapy.ai/admin/editor.html?id=1"
echo "客户端: https://3000-capy-1772251385994-336037-preview.happycapy.ai/client/index.html?id=1"
