import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  ShoppingCart,
  Zap,
  ArrowUpRight,
  Info,
  Layers,
  Database
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const API_BASE = 'http://localhost:5000/api';
const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];

const Dashboard = () => {
  const [stats, setStats] = useState({
    active: false,
    total_transactions: 0,
    unique_items_count: 0,
    top_items: [],
    recommended_algorithm: 'None'
  });
  const [trends, setTrends] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const activeDatasetId = localStorage.getItem('activeDatasetId');
        
        // Get general statistics
        const statsUrl = activeDatasetId ? `${API_BASE}/stats?dataset_id=${activeDatasetId}` : `${API_BASE}/stats`;
        const statsRes = await axios.get(statsUrl);
        setStats(statsRes.data);

        if (statsRes.data.active) {
          // Get trends
          const trendsUrl = activeDatasetId ? `${API_BASE}/trends?dataset_id=${activeDatasetId}` : `${API_BASE}/trends`;
          const trendsRes = await axios.get(trendsUrl);
          setTrends(trendsRes.data.trends || []);

          // Run a quick default mine to show high-confidence rules
          const mineRes = await axios.post(`${API_BASE}/mine`, {
            min_support: 0.05,
            min_confidence: 0.5,
            min_lift: 1.0,
            dataset_id: activeDatasetId
          });
          setRules(mineRes.data.rules || []);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Format category/pie chart data based on top items
  const getPieData = () => {
    if (!stats.top_items || stats.top_items.length === 0) return [];
    return stats.top_items.slice(0, 5).map(item => ({
      name: item.name,
      value: item.value
    }));
  };

  const pieData = getPieData();
  const totalItemCount = pieData.reduce((sum, item) => sum + item.value, 0);

  // Format high confidence rules (top 5 sorted by confidence descending)
  const getFilteredRules = (rawRules) => {
    const seen = new Map();
    rawRules.forEach(rule => {
      const key = [...rule.antecedents, ...rule.consequents].sort().join(',');
      const existing = seen.get(key);
      if (!existing || rule.confidence > existing.confidence) {
        seen.set(key, rule);
      }
    });
    return Array.from(seen.values());
  };

  const sortedRules = getFilteredRules(rules)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Market Insights</h1>
          <p className="page-subtitle">Specialized buying pattern finding for your retail niche.</p>
        </div>
      </div>

      {!stats.active ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', background: 'rgba(255, 255, 255, 0.01)', borderStyle: 'dashed', textAlign: 'center' }}>
          <Database size={48} style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem' }}>No Active Business Data Found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            It looks like there are no purchases loaded in the system database. Head to the **Shopping Pattern Finder** to upload your CSV receipts or load a retail template to view analytics.
          </p>
          <a href="/analytics" className="btn btn-primary" style={{ padding: '0.75rem 2rem', textDecoration: 'none' }}>
            Go to Shopping Pattern Finder
          </a>
        </div>
      ) : (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="card stat-card">
              <div className="stat-label">Total Purchases</div>
              <div className="stat-value">{stats.total_transactions.toLocaleString()}</div>
              <div className="stat-trend trend-up" style={{ fontSize: '0.85rem' }}>
                <ArrowUpRight size={16} /> Live Count
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Different Items Sold</div>
              <div className="stat-value">{stats.unique_items_count}</div>
              <div className="stat-trend trend-up" style={{ fontSize: '0.85rem' }}>
                <ArrowUpRight size={16} /> Items Tracked
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Patterns Found</div>
              <div className="stat-value">{rules.length}</div>
              <div className="stat-trend trend-up" style={{ fontSize: '0.85rem' }}>
                <ArrowUpRight size={16} /> Based on Your Data
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Chart 1: Transaction Frequency Trends */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: '600' }}>How Busy Each Day Was</h3>
              </div>
              <div style={{ height: '300px' }}>
                {trends.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No daily trends available. Real-time entry logs are grouped here.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 10, right: 25, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                        padding={{ left: 15, right: 15 }}
                        tickFormatter={(str) => {
                          if (!str || typeof str !== 'string') return str;
                          const parts = str.split('-');
                          if (parts.length !== 3) return str;
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          const monthIdx = parseInt(parts[1], 10) - 1;
                          const month = months[monthIdx] || parts[1];
                          const day = parts[2];
                          return `${month} ${day}`;
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card-bg)',
                          borderColor: 'var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-main)',
                          fontSize: '12px'
                        }}
                      />
                      <Area type="monotone" dataKey="count" name="Purchases Count" stroke="#6366f1" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Top Selling Products */}
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>What People Buy Most</h3>
              {pieData.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No products sold yet.
                </div>
              ) : (
                <>
                  <div style={{ height: '180px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0.5rem 0' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--card-bg)',
                            borderColor: 'var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-main)',
                            fontSize: '12px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ marginTop: '0.75rem', maxHeight: '110px', overflowY: 'auto', paddingRight: '4px' }}>
                    {pieData.map((item, index) => (
                      <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                          <span style={{ color: '#fff', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{item.value}</span>
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ({totalItemCount > 0 ? `${Math.round((item.value / totalItemCount) * 100)}%` : '0%'})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Strongest Buying Patterns Table */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} style={{ color: 'var(--primary-color)' }} /> Strongest Buying Patterns
            </h3>
            <div className="table-container">
              {sortedRules.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No rules meet the confidence threshold. Adjust mining parameters in the Shopping Pattern Finder.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>If They Buy…</th>
                      <th>…They Also Buy</th>
                      <th>How Common This Is</th>
                      <th>How Likely</th>
                      <th>How Strong the Link Is</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRules.map((rule, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600', color: '#fff' }}>{rule.antecedents.join(', ')}</td>
                        <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{rule.consequents.join(', ')}</td>
                        <td className="mono">{(rule.support * 100).toFixed(1)}%</td>
                        <td className="mono" style={{ color: rule.confidence >= 0.7 ? '#10b981' : '#f59e0b', fontWeight: '700' }}>{(rule.confidence * 100).toFixed(1)}%</td>
                        <td className="mono" style={{ fontWeight: '600' }}>{rule.lift.toFixed(2)}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
