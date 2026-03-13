import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, message } from 'antd';
import { DashboardOutlined, LogoutOutlined, PlusOutlined } from '@ant-design/icons';
import BillboardList from '../components/BillboardList';
import BillboardEditor from '../components/BillboardEditor';
import './Dashboard.css';

const { Header, Content, Sider } = Layout;

function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState('list');

  const handleLogout = () => {
    onLogout();
    message.success('已退出登录');
    navigate('/login');
  };

  return (
    <Layout className="dashboard-layout">
      <Header className="dashboard-header">
        <div className="logo">煤矿内参告示牌系统</div>
        <Button icon={<LogoutOutlined />} onClick={handleLogout}>
          退出登录
        </Button>
      </Header>
      <Layout>
        <Sider width={200} className="site-layout-background">
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            style={{ height: '100%', borderRight: 0 }}
            items={[
              {
                key: 'list',
                icon: <DashboardOutlined />,
                label: '告示牌列表',
                onClick: () => {
                  setSelectedKey('list');
                  navigate('/');
                }
              }
            ]}
          />
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content className="site-layout-content">
            <Routes>
              <Route path="/" element={<BillboardList />} />
              <Route path="/billboard/:id" element={<BillboardEditor />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default Dashboard;
