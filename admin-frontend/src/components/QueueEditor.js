import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, message, Space, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { updateQueueData, updateAds } from '../api';

function QueueEditor({ billboardId, data, onUpdate }) {
  const [queueData, setQueueData] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) {
      setQueueData(data.queue || []);
      setAds(data.queueAds || []);
    }
  }, [data]);

  const handleAddRow = () => {
    setQueueData([...queueData, {
      pit_name: '',
      contracted: '',
      queuing: '',
      called: '',
      entered: ''
    }]);
  };

  const handleDeleteRow = (index) => {
    const newData = [...queueData];
    newData.splice(index, 1);
    setQueueData(newData);
  };

  const handleCellChange = (index, field, value) => {
    const newData = [...queueData];
    newData[index][field] = value;
    setQueueData(newData);
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
      await updateQueueData(billboardId, queueData);
      await updateAds(billboardId, 'queue', ads);
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
      width: 150,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'pit_name', e.target.value)}
          placeholder="例如：汇能2号"
        />
      ),
    },
    {
      title: '已磨约',
      dataIndex: 'contracted',
      key: 'contracted',
      width: 120,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'contracted', e.target.value)}
        />
      ),
    },
    {
      title: '排队中',
      dataIndex: 'queuing',
      key: 'queuing',
      width: 120,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'queuing', e.target.value)}
        />
      ),
    },
    {
      title: '已叫号',
      dataIndex: 'called',
      key: 'called',
      width: 120,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'called', e.target.value)}
        />
      ),
    },
    {
      title: '已入场',
      dataIndex: 'entered',
      key: 'entered',
      width: 120,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'entered', e.target.value)}
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
      <Card title="排队拉运数据" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button icon={<PlusOutlined />} onClick={handleAddRow}>
            添加行
          </Button>
          <Table
            columns={columns}
            dataSource={queueData}
            rowKey={(record, index) => index}
            pagination={false}
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

export default QueueEditor;
