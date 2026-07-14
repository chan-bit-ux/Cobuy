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
        // Get general statistics
        const statsRes = await axios.get(`${API_BASE}/stats`);
        setStats(statsRes.data);

        if (statsRes.data.active) {
          // Get trends
          const trendsRes = await axios.get(`${API_BASE}/trends`);
          setTrends(trendsRes.data.trends || []);

          // Run a quick default mine to show high-confidence rules
          const mineRes = await axios.post(`${API_BASE}/mine`, {
            min_support: 0.05,
            min_confidence: 0.5,
            min_lift: 1.0
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
  const sortedRules = [...rules]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Market Insights</h1>
          <p className="page-subtitle">Specialized association rule mining for your retail niche.</p>
        </div>
      </div>

      {!stats.active ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', background: 'rgba(255, 255, 255, 0.01)', borderStyle: 'dashed', textAlign: 'center' }}>
          <Database size={48} style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '0.75rem' }}>No Active Business Data Found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            It looks like there are no transactions loaded in the system database. Head to the **Rule Mining Center** to upload your CSV receipts or load a retail template to view analytics.
          </p>
          <a href="/analytics" className="btn btn-primary" style={{ padding: '0.75rem 2rem', textDecoration: 'none' }}>
            Go to Rule Mining Center
          </a>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <div className="stat-label">Total Transactions</div>
              <div className="stat-value">{stats.total_transactions.toLocaleString()}</div>
              <div className="stat-trend trend-up" style={{ fontSize: '0.7rem' }}>
                <ArrowUpRight size={14} /> Active Database Record
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Unique Products</div>
              <div className="stat-value">{stats.unique_items_count}</div>
              <div className="stat-trend trend-up" style={{ fontSize: '0.7rem' }}>
                <ArrowUpRight size={14} /> Distinct SKUs mapped
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Rules Mined</div>
              <div className="stat-value">{rules.length}</div>
              <div className="stat-trend trend-up" style={{ fontSize: '0.7rem' }}>
                <ArrowUpRight size={14} /> At current workspace support
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Niche Engine Recommendation</div>
              <div className="stat-value" style={{ fontSize: '1.6rem', marginTop: '0.35rem' }}>{stats.recommended_algorithm}</div>
              <div className="stat-trend trend-up" style={{ fontSize: '0.7rem' }}>
                <ArrowUpRight size={14} /> Optimal complexity selection
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Chart 1: Transaction Frequency Trends */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: '600' }}>Transaction Frequency Trends</h3>
              </div>
              <div style={{ height: '300px' }}>
                {trends.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No daily trends available. Real-time entry logs are grouped here.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends}>
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
                      <Area type="monotone" dataKey="count" name="Transactions Count" stroke="#6366f1" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Top Selling Products Share */}
            <div className="card">
              <h3 style={{ fontWeight: '600', marginBottom: '1.5rem' }}>Top Products Distribution</h3>
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: '1rem', maxHeight: '120px', overflowY: 'auto' }}>
                {pieData.map((item, index) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.name}</span>
                    </div>
                    <span style={{ fontWeight: '500', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                      {totalItemCount > 0 ? `${Math.round((item.value / totalItemCount) * 100)}%` : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* High-Confidence Association Rules Table */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} style={{ color: 'var(--primary-color)' }} /> Top High-Confidence Rules
            </h3>
            <div className="table-container">
              {sortedRules.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No rules meet the confidence threshold. Adjust mining parameters in the Rule Mining Center.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Antecedent</th>
                      <th>Consequent</th>
                      <th>Support</th>
                      <th>Confidence</th>
                      <th>Lift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRules.map((rule, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600', color: '#fff' }}>{`{${rule.antecedents.join(', ')}}`}</td>
                        <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{`{${rule.consequents.join(', ')}}`}</td>
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
