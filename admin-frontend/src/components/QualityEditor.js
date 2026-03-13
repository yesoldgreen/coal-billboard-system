import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, message, Space, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { updateQualityData, updateAds } from '../api';

function QualityEditor({ billboardId, data, onUpdate }) {
  const [qualityData, setQualityData] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) {
      setQualityData(data.quality || []);
      setAds(data.qualityAds || []);
    }
  }, [data]);

  const handleAddRow = () => {
    setQualityData([...qualityData, {
      pit_name: '',
      heat_value: '',
      ash: '',
      sulfur: '',
      price: '',
      change_value: ''
    }]);
  };

  const handleDeleteRow = (index) => {
    const newData = [...qualityData];
    newData.splice(index, 1);
    setQualityData(newData);
  };

  const handleCellChange = (index, field, value) => {
    const newData = [...qualityData];
    newData[index][field] = value;
    setQualityData(newData);
  };

  const handleAddAd = () => {
    setAds([...ads, { content: '' }]);
  };

  const handleDeleteAd = (index) => {
    const newAds = [...ads];
    newAds.splice(index, 1);
    setAds(newAds);
  };

  const handleAdChange = (index, value) => {
    const newAds = [...ads];
    newAds[index].content = value;
    setAds(newAds);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateQualityData(billboardId, qualityData);
      await updateAds(billboardId, 'quality', ads);
      message.success('保存成功');
      onUpdate();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '坑口',
      dataIndex: 'pit_name',
      key: 'pit_name',
      width: 120,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'pit_name', e.target.value)}
          placeholder="例如：汇能2号"
        />
      ),
    },
    {
      title: '热值',
      dataIndex: 'heat_value',
      key: 'heat_value',
      width: 100,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'heat_value', e.target.value)}
          placeholder="例如：5000"
        />
      ),
    },
    {
      title: '灰分',
      dataIndex: 'ash',
      key: 'ash',
      width: 100,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'ash', e.target.value)}
          placeholder="例如：15"
        />
      ),
    },
    {
      title: '硫',
      dataIndex: 'sulfur',
      key: 'sulfur',
      width: 100,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'sulfur', e.target.value)}
          placeholder="例如：0.5"
        />
      ),
    },
    {
      title: '含税价格',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'price', e.target.value)}
          placeholder="例如：680"
        />
      ),
    },
    {
      title: '较上期变动',
      dataIndex: 'change_value',
      key: 'change_value',
      width: 120,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'change_value', e.target.value)}
          placeholder="例如：+10 或 -5"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record, index) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={() => handleDeleteRow(index)}
        >
          删除
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card title="质量/价格数据" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button icon={<PlusOutlined />} onClick={handleAddRow}>
            添加行
          </Button>
          <Table
            columns={columns}
            dataSource={qualityData}
            rowKey={(record, index) => index}
            pagination={false}
            scroll={{ x: 800 }}
          />
        </Space>
      </Card>

      <Card title="广告" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button icon={<PlusOutlined />} onClick={handleAddAd}>
            添加广告
          </Button>
          {ads.map((ad, index) => (
            <Space key={index} style={{ width: '100%' }}>
              <Input
                style={{ flex: 1 }}
                value={ad.content}
                onChange={(e) => handleAdChange(index, e.target.value)}
                placeholder="例如：八通煤炭 136 1234 5678 汇能长滩专业代发 九年老店"
              />
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteAd(index)}
              >
                删除
              </Button>
            </Space>
          ))}
        </Space>
      </Card>

      <Button
        type="primary"
        icon={<SaveOutlined />}
        size="large"
        onClick={handleSave}
        loading={loading}
      >
        保存所有数据
      </Button>
    </div>
  );
}

export default QualityEditor;
