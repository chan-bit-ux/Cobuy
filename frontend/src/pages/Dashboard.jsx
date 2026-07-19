import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  ShoppingCart,
  Zap,
  ArrowUpRight,
  Info,
  Layers,
  Database,
  HelpCircle,
  X,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const API_BASE = 'http://localhost:5000/api';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'];

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--card-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        boxShadow: 'var(--card-shadow)',
        color: 'var(--text-main)'
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontFamily: 'var(--font-mono)' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: payload[0].payload.color || '#10b981' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
            {payload[0].value} purchases
          </span>
        </div>
      </div>
    );
  }
  return null;
};

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
  const [timeFilter, setTimeFilter] = useState('7D');
  const [showPatternsModal, setShowPatternsModal] = useState(false);

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

          // Run adaptive mining to show high-confidence rules
          const mineRes = await axios.post(`${API_BASE}/mine`, {
            algorithm: 'auto',
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
  const maxPieValue = pieData.length > 0 ? Math.max(...pieData.map(d => d.value)) : 1;

  // Calculate trends peak & filtering
  const filteredTrends = trends.slice(
    timeFilter === '7D' ? Math.max(0, trends.length - 7) : timeFilter === '30D' ? Math.max(0, trends.length - 30) : 0
  );
  const maxCount = filteredTrends.length > 0 ? Math.max(...filteredTrends.map(t => t.count)) : 0;
  const peakDay = filteredTrends.find(t => t.count === maxCount);

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
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <TrendingUp size={28} style={{ color: 'var(--primary-color)' }} />
            Market Insights
          </h1>
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
            {/* Chart 1: Option 2 Executive Bar Pillars */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontWeight: '700', fontSize: '1.15rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    How Busy Each Day Was
                    {peakDay && (
                      <span style={{ fontSize: '0.75rem', background: 'var(--badge-bg)', color: 'var(--accent-color)', padding: '0.2rem 0.6rem', borderRadius: '100px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', border: '1px solid var(--border-color)' }}>
                        🔥 Peak: {peakDay.date} ({peakDay.count} tx)
                      </span>
                    )}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--inner-box-bg)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {['7D', '30D', 'All'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTimeFilter(filter)}
                      style={{
                        background: timeFilter === filter ? 'var(--primary-color)' : 'transparent',
                        color: timeFilter === filter ? '#fff' : 'var(--text-muted)',
                        border: 'none',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {filter === 'All' ? 'All Time' : filter}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: '300px' }}>
                {filteredTrends.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No daily trends available in this time range.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredTrends} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-color)" strokeOpacity={0.6} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
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
                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                      />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'var(--inner-box-bg)', opacity: 0.5 }} />
                      <Bar dataKey="count" name="Purchases" radius={[6, 6, 0, 0]} maxBarSize={45} animationDuration={450} isAnimationActive={true}>
                        {filteredTrends.map((entry, index) => {
                          const isPeak = entry.count === maxCount && maxCount > 0;
                          return (
                            <Cell
                              key={`bar-${index}`}
                              fill={isPeak ? 'var(--accent-color)' : 'var(--primary-color)'}
                              style={{
                                filter: isPeak ? 'drop-shadow(0 0 8px var(--accent-color))' : 'none',
                                transition: 'all 0.3s ease'
                              }}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Option 2 Horizontal Leaderboard Progress Grid */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontWeight: '700', fontSize: '1.15rem', color: 'var(--text-main)' }}>What People Buy Most</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--inner-box-bg)', padding: '0.25rem 0.65rem', borderRadius: '100px', border: '1px solid var(--border-color)' }}>
                  🏆 {totalItemCount.toLocaleString()} Total Units
                </span>
              </div>

              {pieData.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No products sold yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', maxHeight: '315px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {pieData.map((item, index) => {
                    const percentage = totalItemCount > 0 ? Math.round((item.value / totalItemCount) * 100) : 0;
                    const barWidth = `${Math.min(100, Math.max(8, Math.round((item.value / maxPieValue) * 100)))}%`;
                    const barOpacity = Math.max(0.4, 1 - index * 0.15);

                    return (
                      <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <span style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              background: index === 0 ? 'rgba(59, 130, 246, 0.15)' : 'var(--inner-box-bg)',
                              border: '1px solid var(--border-color)',
                              color: index === 0 ? 'var(--primary-color)' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              #{index + 1}
                            </span>
                            <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                              {item.name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                              {item.value.toLocaleString()} sales
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '38px', textAlign: 'right' }}>
                              {percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Cohesive Monochromatic Progress Track */}
                        <div style={{ width: '100%', height: '8px', background: 'var(--inner-box-bg)', borderRadius: '100px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <div style={{
                            width: barWidth,
                            height: '100%',
                            background: 'var(--primary-color)',
                            opacity: barOpacity,
                            borderRadius: '100px',
                            transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Strongest Buying Patterns Table */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={18} style={{ color: 'var(--primary-color)' }} /> Strongest Buying Patterns
              </div>
              <button
                onClick={() => setShowPatternsModal(true)}
                style={{
                  background: 'var(--inner-box-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--primary-color)';
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Click to see how buying patterns and calculations work"
              >
                <HelpCircle size={17} />
              </button>
            </h3>
            <div className="table-container">
              {sortedRules.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No strong buying patterns discovered even after relaxing thresholds to the minimum floor (0.01% support, 2% confidence).
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

      {/* Association Rules / Strongest Buying Patterns Explainer Modal */}
      {showPatternsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowPatternsModal(false);
        }}>
          <div className="card fade-in" style={{
            maxWidth: '780px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '2.2rem',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--sidebar-active-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                    Strongest Buying Patterns & Calculations
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                    Executive breakdown of retail cross-selling algorithms (`Apriori / FP-Growth`)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPatternsModal(false)}
                style={{
                  background: 'var(--inner-box-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* What is this section */}
            <div style={{
              background: 'var(--sidebar-active-bg)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.75rem'
            }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--primary-color)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} /> What Does "Strongest Buying Patterns" Mean?
              </h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
                This table reveals the most powerful <strong>co-purchasing behaviors</strong> discovered in your store's transaction history. Instead of just looking at top-selling items individually, it answers the question: <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>"When a shopper puts Item X in their cart, what else do they automatically grab before checkout?"</span> These rules empower retail managers to build targeted bundles, optimize shelf placement, and increase Average Order Value (AOV).
              </p>
            </div>

            {/* How the Calculations Work */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} style={{ color: 'var(--accent-color)' }} /> How the 3 Key Calculations Work
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.75rem' }}>
              {/* Step 1: Support */}
              <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>1. How Common This Is (`Support`)</span>
                  <span className="mono" style={{ fontSize: '0.8rem', background: 'var(--badge-bg)', padding: '0.2rem 0.6rem', borderRadius: '100px', color: 'var(--text-muted)' }}>Baseline Volume</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 0.6rem' }}>
                  Measures the <strong>percentage of all customer receipts</strong> that contain both items (`If They Buy...` and `...They Also Buy`) together in the same basket.
                </p>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.6rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--primary-color)' }}>
                  Support = (Transactions with Both Items) ÷ (Total Store Transactions)
                </div>
              </div>

              {/* Step 2: Confidence */}
              <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>2. How Likely (`Confidence`)</span>
                  <span className="mono" style={{ fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>Probability %</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 0.6rem' }}>
                  Measures the <strong>reliability of the rule</strong>. When a customer has already selected the first item, what is the exact probability % that they also purchase the second item?
                </p>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.6rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                  Confidence = (Transactions with Both Items) ÷ (Transactions with First Item Only)
                </div>
              </div>

              {/* Step 3: Lift */}
              <div style={{ background: 'var(--inner-box-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>3. How Strong the Link Is (`Lift`)</span>
                  <span className="mono" style={{ fontSize: '0.8rem', background: 'rgba(124, 58, 237, 0.15)', color: 'var(--accent-color)', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>Multiplier (x)</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 0.6rem' }}>
                  Measures how much <strong>stronger the connection is</strong> compared to buying the second item purely by chance (`1.00x`).
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem 0.8rem', borderRadius: '6px', color: 'var(--primary-color)' }}>
                    <strong>&gt; 1.00x:</strong> Strong Positive Link (`e.g., 2.50x = 2.5x more likely to buy together`)
                  </div>
                  <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem 0.8rem', borderRadius: '6px', color: 'var(--text-muted)' }}>
                    <strong>= 1.00x:</strong> Completely Unrelated Items
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Tips Footer */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-color)' }} />
                <span>Tip: Click <strong>Shopping Pattern Finder</strong> in the sidebar to adjust minimum Support & Confidence thresholds.</span>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowPatternsModal(false)}
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
