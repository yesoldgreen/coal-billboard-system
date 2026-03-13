import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CopyOutlined } from '@ant-design/icons';
import { getBillboards, createBillboard, updateBillboard, deleteBillboard } from '../api';

function BillboardList() {
  const navigate = useNavigate();
  const [billboards, setBillboards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBillboard, setEditingBillboard] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadBillboards();
  }, []);

  const loadBillboards = async () => {
    setLoading(true);
    try {
      const response = await getBillboards();
      setBillboards(response.data.data);
    } catch (error) {
      message.error('加载告示牌列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingBillboard(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (billboard) => {
    setEditingBillboard(billboard);
    form.setFieldsValue({ name: billboard.name });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteBillboard(id);
      message.success('删除成功');
      loadBillboards();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingBillboard) {
        await updateBillboard(editingBillboard.id, values.name);
        message.success('更新成功');
      } else {
        await createBillboard(values.name);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadBillboards();
    } catch (error) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(editingBillboard ? '更新失败' : '创建失败');
    }
  };

  const copyClientUrl = (id) => {
    const url = `${window.location.origin.replace('3001', '3002')}/billboard/${id}`;
    navigator.clipboard.writeText(url);
    message.success('客户端链接已复制到剪贴板');
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '告示牌名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/billboard/${record.id}`)}
          >
            编辑数据
          </Button>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            改名
          </Button>
          <Button
            icon={<CopyOutlined />}
            size="small"
            onClick={() => copyClientUrl(record.id)}
          >
            复制链接
          </Button>
          <Popconfirm
            title="确定要删除这个告示牌吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建告示牌
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={billboards}
        rowKey="id"
        loading={loading}
      />
      <Modal
        title={editingBillboard ? '编辑告示牌' : '创建告示牌'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="告示牌名称"
            rules={[{ required: true, message: '请输入告示牌名称' }]}
          >
            <Input placeholder="例如：汇能长滩 煤矿内参" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default BillboardList;
