import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './Billboard.css';

const API_BASE_URL = 'http://localhost:3000/api';

function Billboard() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
    // 每30秒自动刷新数据
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const loadData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/client/billboards/${id}`);
      if (response.data.success) {
        setData(response.data.data);
        setError(null);
      }
    } catch (err) {
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return '';
    const date = new Date(datetime);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="error-container">
        <div className="error">{error || '告示牌不存在'}</div>
      </div>
    );
  }

  return (
    <div className="billboard-container">
      {/* 顶栏 */}
      <div className="header">
        <div className="header-logo">煤</div>
        <div className="header-title">{data.billboard.name}</div>
      </div>

      {/* 排队拉运模块 */}
      <div className="module module-queue">
        <div className="module-header">
          <span className="module-title">排队拉运</span>
          {data.updateTimes.queue && (
            <span className="update-time">更新：{formatDateTime(data.updateTimes.queue)}</span>
          )}
        </div>
        {data.queueAds && data.queueAds.length > 0 && (
          <div className="ads-container">
            {data.queueAds.map((ad, index) => (
              <div key={index} className="ad-item">{ad.content}</div>
            ))}
          </div>
        )}
        <table className="data-table">
          <thead>
            <tr>
              <th>坑口</th>
              <th>已磨约</th>
              <th>排队中</th>
              <th>已叫号</th>
              <th>已入场</th>
            </tr>
          </thead>
          <tbody>
            {data.queue.map((item, index) => (
              <tr key={index}>
                <td>{item.pit_name}</td>
                <td>{item.contracted}</td>
                <td>{item.queuing}</td>
                <td>{item.called}</td>
                <td>{item.entered}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 质量/价格模块 */}
      <div className="module module-quality">
        <div className="module-header">
          <span className="module-title">质量/价格</span>
          {data.updateTimes.quality && (
            <span className="update-time">更新：{formatDateTime(data.updateTimes.quality)}</span>
          )}
        </div>
        {data.qualityAds && data.qualityAds.length > 0 && (
          <div className="ads-container">
            {data.qualityAds.map((ad, index) => (
              <div key={index} className="ad-item">{ad.content}</div>
            ))}
          </div>
        )}
        <table className="data-table">
          <thead>
            <tr>
              <th>坑口</th>
              <th>热值</th>
              <th>灰分</th>
              <th>硫</th>
              <th>含税价格</th>
              <th>较上期变动</th>
            </tr>
          </thead>
          <tbody>
            {data.quality.map((item, index) => (
              <tr key={index}>
                <td>{item.pit_name}</td>
                <td>{item.heat_value}</td>
                <td>{item.ash}</td>
                <td>{item.sulfur}</td>
                <td>{item.price}</td>
                <td className={item.change_value && item.change_value.startsWith('+') ? 'change-up' : item.change_value && item.change_value.startsWith('-') ? 'change-down' : ''}>
                  {item.change_value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 物流费用模块 */}
      <div className="module module-logistics">
        <div className="module-header">
          <span className="module-title">物流费用</span>
          {data.updateTimes.logistics && (
            <span className="update-time">更新：{formatDateTime(data.updateTimes.logistics)}</span>
          )}
        </div>
        {data.logisticsAds && data.logisticsAds.length > 0 && (
          <div className="ads-container">
            {data.logisticsAds.map((ad, index) => (
              <div key={index} className="ad-item">{ad.content}</div>
            ))}
          </div>
        )}
        <table className="data-table logistics-table">
          <thead>
            <tr>
              <th colSpan="2" className="section-header">汽运</th>
              <th colSpan="3" className="section-header">集运站</th>
              <th colSpan="2" className="section-header">汽运</th>
            </tr>
            <tr>
              <th>起点-终点</th>
              <th>汽运费</th>
              <th>集运站</th>
              <th>站运费</th>
              <th>站台费</th>
              <th>起点-终点</th>
              <th>运费</th>
            </tr>
          </thead>
          <tbody>
            {data.logistics.map((item, index) => {
              if (item.route_type === 'station') {
                return (
                  <tr key={index}>
                    <td colSpan="2"></td>
                    <td>{item.station_name}</td>
                    <td>{item.station_freight}</td>
                    <td>{item.station_fee}</td>
                    <td colSpan="2"></td>
                  </tr>
                );
              } else {
                const routeText = item.from_location && item.to_location
                  ? `${item.from_location}-${item.to_location}`
                  : '';
                // 根据索引判断是左侧还是右侧
                const directRoutes = data.logistics.filter(l => l.route_type === 'direct');
                const currentIndex = directRoutes.findIndex(l => l.id === item.id);

                if (currentIndex % 2 === 0) {
                  // 左侧
                  return (
                    <tr key={index}>
                      <td>{routeText}</td>
                      <td>{item.freight}</td>
                      <td colSpan="3"></td>
                      <td colSpan="2"></td>
                    </tr>
                  );
                } else {
                  // 右侧
                  return (
                    <tr key={index}>
                      <td colSpan="5"></td>
                      <td>{routeText}</td>
                      <td>{item.freight}</td>
                    </tr>
                  );
                }
              }
            })}
          </tbody>
        </table>
      </div>

      {/* 底栏 */}
      <div className="footer">
        <div className="footer-left">
          <div className="footer-text">扫码 +v 进群看</div>
          <div className="footer-phone">咨询电话：18622815982</div>
        </div>
        <div className="footer-right">
          <div className="qrcode-group">
            <div className="qrcode-box">
              <div className="qrcode-placeholder">二维码</div>
              <div className="qrcode-label">付费群 每日更新</div>
            </div>
            <div className="qrcode-box">
              <div className="qrcode-placeholder">二维码</div>
              <div className="qrcode-label">免费群 每周更新</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Billboard;
