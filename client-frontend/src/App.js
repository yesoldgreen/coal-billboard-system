import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Billboard from './pages/Billboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/billboard/:id" element={<Billboard />} />
        <Route path="/" element={<div style={{ padding: '50px', textAlign: 'center' }}>
          <h2>煤矿内参告示牌系统</h2>
          <p>请使用正确的告示牌链接访问</p>
        </div>} />
      </Routes>
    </Router>
  );
}

export default App;
