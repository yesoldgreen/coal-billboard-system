import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, message, Space, Card, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { updateLogisticsData, updateAds } from '../api';

function LogisticsEditor({ billboardId, data, onUpdate }) {
  const [logisticsData, setLogisticsData] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) {
      setLogisticsData(data.logistics || []);
      setAds(data.logisticsAds || []);
    }
  }, [data]);

  const handleAddRow = () => {
    setLogisticsData([...logisticsData, {
      route_type: 'direct',
      from_location: '',
      to_location: '',
      freight: '',
      station_name: '',
      station_freight: '',
      station_fee: ''
    }]);
  };

  const handleDeleteRow = (index) => {
    const newData = [...logisticsData];
    newData.splice(index, 1);
    setLogisticsData(newData);
  };

  const handleCellChange = (index, field, value) => {
    const newData = [...logisticsData];
    newData[index][field] = value;
    setLogisticsData(newData);
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
      await updateLogisticsData(billboardId, logisticsData);
      await updateAds(billboardId, 'logistics', ads);
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
      title: '类型',
      dataIndex: 'route_type',
      key: 'route_type',
      width: 120,
      render: (text, record, index) => (
        <Select
          value={text}
          onChange={(value) => handleCellChange(index, 'route_type', value)}
          style={{ width: '100%' }}
        >
          <Select.Option value="direct">直运</Select.Option>
          <Select.Option value="station">集运站</Select.Option>
        </Select>
      ),
    },
    {
      title: '起点',
      dataIndex: 'from_location',
      key: 'from_location',
      width: 150,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'from_location', e.target.value)}
          placeholder="例如：长滩矿"
        />
      ),
    },
    {
      title: '终点',
      dataIndex: 'to_location',
      key: 'to_location',
      width: 150,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'to_location', e.target.value)}
          placeholder="例如：邯郸"
        />
      ),
    },
    {
      title: '运费',
      dataIndex: 'freight',
      key: 'freight',
      width: 100,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'freight', e.target.value)}
          placeholder="例如：120"
        />
      ),
    },
    {
      title: '集运站名称',
      dataIndex: 'station_name',
      key: 'station_name',
      width: 150,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'station_name', e.target.value)}
          placeholder="仅集运站类型填写"
          disabled={record.route_type !== 'station'}
        />
      ),
    },
    {
      title: '站运费',
      dataIndex: 'station_freight',
      key: 'station_freight',
      width: 100,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'station_freight', e.target.value)}
          placeholder="站运费"
          disabled={record.route_type !== 'station'}
        />
      ),
    },
    {
      title: '站台费',
      dataIndex: 'station_fee',
      key: 'station_fee',
      width: 100,
      render: (text, record, index) => (
        <Input
          value={text}
          onChange={(e) => handleCellChange(index, 'station_fee', e.target.value)}
          placeholder="站台费"
          disabled={record.route_type !== 'station'}
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
      <Card title="物流费用数据" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button icon={<PlusOutlined />} onClick={handleAddRow}>
            添加行
          </Button>
          <Table
            columns={columns}
            dataSource={logisticsData}
            rowKey={(record, index) => index}
            pagination={false}
            scroll={{ x: 1000 }}
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
                placeholder="例如：友达物流 138 0000 8888 汇能长滩派山店专线 河北 内蒙"
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

export default LogisticsEditor;
