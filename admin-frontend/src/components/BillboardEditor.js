import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Button, message, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getBillboardData } from '../api';
import QueueEditor from './QueueEditor';
import QualityEditor from './QualityEditor';
import LogisticsEditor from './LogisticsEditor';
import './BillboardEditor.css';

function BillboardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [billboardData, setBillboardData] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getBillboardData(id);
      setBillboardData(response.data.data);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const items = [
    {
      key: 'queue',
      label: '排队拉运',
      children: <QueueEditor billboardId={id} data={billboardData} onUpdate={loadData} />,
    },
    {
      key: 'quality',
      label: '质量/价格',
      children: <QualityEditor billboardId={id} data={billboardData} onUpdate={loadData} />,
    },
    {
      key: 'logistics',
      label: '物流费用',
      children: <LogisticsEditor billboardId={id} data={billboardData} onUpdate={loadData} />,
    },
  ];

  return (
    <div className="billboard-editor">
      <div className="editor-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
          返回列表
        </Button>
        <h2>{billboardData?.billboard?.name}</h2>
      </div>
      <Tabs items={items} />
    </div>
  );
}

export default BillboardEditor;
