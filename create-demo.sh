#!/bin/bash

# 获取Token
TOKEN=$(curl -s -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hulianshikong","password":"hlsk2026"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 创建告示牌
BILLBOARD_ID=$(curl -s -X POST http://localhost:3000/api/billboards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"汇能长滩 煤矿内参"}' | grep -o '"id":[0-9]*' | cut -d':' -f2)

echo "Created Billboard ID: $BILLBOARD_ID"

# 添加排队拉运数据
curl -s -X PUT http://localhost:3000/api/billboards/$BILLBOARD_ID/queue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data": [
      {"pit_name":"汇能2号","contracted":"120","queuing":"35","called":"8","entered":"5"},
      {"pit_name":"汇能3号","contracted":"95","queuing":"28","called":"6","entered":"3"},
      {"pit_name":"长滩1号","contracted":"150","queuing":"42","called":"10","entered":"7"}
    ]
  }'

echo "Added queue data"

# 添加排队拉运广告
curl -s -X PUT http://localhost:3000/api/billboards/$BILLBOARD_ID/ads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "moduleType": "queue",
    "data": [
      {"content":"八通煤炭 136 1234 5678 汇能长滩专业代发 九年老店"},
      {"content":"顺达物流 138 8888 6666 长滩煤矿直运 价格优惠"}
    ]
  }'

echo "Added queue ads"

# 添加质量/价格数据
curl -s -X PUT http://localhost:3000/api/billboards/$BILLBOARD_ID/quality \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data": [
      {"pit_name":"汇能2号","heat_value":"5500","ash":"21.5","sulfur":"0.8","price":"720","change_value":"+10"},
      {"pit_name":"汇能3号","heat_value":"5800","ash":"19.2","sulfur":"0.6","price":"760","change_value":"+15"},
      {"pit_name":"长滩1号","heat_value":"6000","ash":"18.5","sulfur":"0.5","price":"800","change_value":"-5"}
    ]
  }'

echo "Added quality/price data"

# 添加质量/价格广告
curl -s -X PUT http://localhost:3000/api/billboards/$BILLBOARD_ID/ads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "moduleType": "quality",
    "data": [
      {"content":"诚信煤炭 150 0000 8888 汇能煤质检测 权威认证"}
    ]
  }'

echo "Added quality ads"

# 添加物流费用数据
curl -s -X PUT http://localhost:3000/api/billboards/$BILLBOARD_ID/logistics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "data": [
      {"route_type":"direct","from_location":"长滩矿","to_location":"邯郸","freight":"120","station_name":"","station_freight":"","station_fee":""},
      {"route_type":"direct","from_location":"汇能2号","to_location":"石家庄","freight":"150","station_name":"","station_freight":"","station_fee":""},
      {"route_type":"station","from_location":"","to_location":"","freight":"","station_name":"派山集运站","station_freight":"80","station_fee":"15"},
      {"route_type":"direct","from_location":"长滩矿","to_location":"保定","freight":"180","station_name":"","station_freight":"","station_fee":""}
    ]
  }'

echo "Added logistics data"

# 添加物流费用广告
curl -s -X PUT http://localhost:3000/api/billboards/$BILLBOARD_ID/ads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "moduleType": "logistics",
    "data": [
      {"content":"友达物流 138 0000 8888 汇能长滩派山店专线 河北 内蒙"},
      {"content":"快捷运输 139 9999 7777 全国配送 当日达"}
    ]
  }'

echo "Added logistics ads"

echo ""
echo "Demo data created successfully!"
echo "Billboard ID: $BILLBOARD_ID"
echo "You can access the client at: http://localhost:3000/client/index.html?id=$BILLBOARD_ID"
