import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Upload,
  Play,
  Download,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Database,
  Plus,
  Trash2,
  X,
  ShoppingCart,
  Zap,
  TrendingUp,
  Sliders,
  List,
  Lock,
  Unlock,
  RotateCcw,
  Edit,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';

import {
  CartesianGrid,
  Tooltip,
} from 'recharts';



const API_BASE = 'http://localhost:5000/api';

const Analytics = () => {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset_id') || localStorage.getItem('activeDatasetId');
  const activeDatasetName = localStorage.getItem('activeDatasetName');

  const [file, setFile] = useState(() => {
    const savedName = sessionStorage.getItem('analytics_file_name');
    return savedName ? { name: savedName } : null;
  });
  const [uploadStatus, setUploadStatus] = useState(() => {
    const savedName = sessionStorage.getItem('analytics_file_name');
    return savedName ? 'success' : 'idle';
  });
  const [miningStatus, setMiningStatus] = useState(() => {
    const saved = sessionStorage.getItem('analytics_results');
    return saved ? 'success' : 'idle';
  });
  const [activeSubTab, setActiveSubTab] = useState(() => {
    return sessionStorage.getItem('analytics_subtab') || 'recommendations';
  });
  const [duplicateNotice, setDuplicateNotice] = useState(null);

  const [params, setParams] = useState(() => {
    const saved = sessionStorage.getItem('analytics_params');
    return saved ? JSON.parse(saved) : {
      min_support: 0.05,
      min_confidence: 0.5,
      min_lift: 1.0,
      algorithm: 'auto'
    };
  });

  const [results, setResults] = useState(() => {
    const saved = sessionStorage.getItem('analytics_results');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    sessionStorage.setItem('analytics_params', JSON.stringify(params));
  }, [params]);

  useEffect(() => {
    sessionStorage.setItem('analytics_subtab', activeSubTab);
  }, [activeSubTab]);


  // Real-time states
  const [stats, setStats] = useState({
    active: false,
    total_transactions: 0,
    unique_items_count: 0,
    top_items: [],
    all_items: [],
    recommended_algorithm: 'None'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedRules, setExpandedRules] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showCartDesc, setShowCartDesc] = useState(() => {
    const saved = sessionStorage.getItem('show_cart_desc');
    return saved === 'true';
  });
  const [showAnalysisDesc, setShowAnalysisDesc] = useState(() => {
    const saved = sessionStorage.getItem('show_analysis_desc');
    return saved === 'true';
  });

  const toggleRuleExpand = (idx) => {
    setExpandedRules(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const toggleGroupCollapse = (size) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [size]: prev[size] === false ? true : false
    }));
  };

  const [cleaningStats, setCleaningStats] = useState(() => {
    const saved = sessionStorage.getItem('analytics_cleaning_stats');
    return saved ? JSON.parse(saved) : null;
  });

  const handleExportCSV = () => {
    if (!results) return;

    let csvContent = "";

    // 1. Session & Parameters Summary
    let actualAlgo = results.metrics?.algorithm || results.algorithm || params.algorithm || 'Auto';
    if (actualAlgo.toLowerCase().includes('apriori')) {
      actualAlgo = 'Apriori';
    } else if (actualAlgo.toLowerCase().includes('fp-growth') || actualAlgo.toLowerCase().includes('fpgrowth')) {
      actualAlgo = 'FP-Growth';
    }

    csvContent += "=== SUMMARY STATISTICS & PARAMETERS ===\n";
    csvContent += `Total Transactions,${stats.total_transactions || 0}\n`;
    csvContent += `Unique Items Count,${stats.unique_items_count || 0}\n`;
    csvContent += `Algorithm Used,${actualAlgo}\n`;
    csvContent += `Min Support Threshold,${params.min_support}\n`;
    csvContent += `Min Confidence Threshold,${params.min_confidence}\n`;
    csvContent += `Min Lift Threshold,${params.min_lift}\n\n`;

    // 2. Frequent Itemsets Section
    csvContent += "=== FREQUENT ITEMSETS ===\n";
    csvContent += "Frequent Itemset,Qty,N-Item Size,Support\n";
    if (results.frequent_itemsets && results.frequent_itemsets.length > 0) {
      results.frequent_itemsets.forEach(set => {
        const itemsStr = `"${set.items.join(', ')}"`;
        const qty = Math.round(set.support * (stats.total_transactions || 0));
        const size = `${set.items.length}-item set`;
        const supportPct = `${(set.support * 100).toFixed(2)}%`;
        csvContent += `${itemsStr},${qty},${size},${supportPct}\n`;
      });
    } else {
      csvContent += "No frequent itemsets found,,,\n";
    }
    csvContent += "\n";

    // 3. Association Rules / Recommendations Section
    csvContent += "=== ASSOCIATION RULES (RECOMMENDATIONS) ===\n";
    csvContent += "Frequently Bought Together,Association Rule,Confidence,Lift,Recommendation\n";
    if (results.rules && results.rules.length > 0) {
      results.rules.forEach(rule => {
        const fbt = `"${[...rule.antecedents, ...rule.consequents].join(' + ')}"`;
        const associationRuleStr = `"${rule.antecedents.join(', ')} -> ${rule.consequents.join(', ')}"`;
        const confidencePct = `${(rule.confidence * 100).toFixed(1)}%`;
        const liftValue = rule.lift.toFixed(2);

        const isHighConfidence = rule.confidence >= 0.8;
        const isMediumConfidence = rule.confidence >= 0.5 && rule.confidence < 0.8;
        let action = "Consider placing these items near each other.";
        if (isHighConfidence) action = "Create a bundled offer or end-cap display combining these items.";
        else if (isMediumConfidence) action = "Run a cross-promotional discount to encourage joint purchases.";

        csvContent += `${fbt},${associationRuleStr},${confidencePct},${liftValue},"${action}"\n`;
      });
    } else {
      csvContent += "No association rules were found,,,,,\n";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rule_mining_complete_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchStats = async (overrideDatasetId = null) => {
    try {
      const targetId = overrideDatasetId || datasetId;
      const url = targetId ? `${API_BASE}/stats?dataset_id=${targetId}` : `${API_BASE}/stats`;
      const response = await axios.get(url);
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [datasetId]);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploadStatus('uploading');
    sessionStorage.setItem('analytics_file_name', selectedFile.name);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData);
      setUploadStatus('success');
      if (response.data.dataset_id) {
        localStorage.setItem('activeDatasetId', response.data.dataset_id);
        localStorage.setItem('activeDatasetName', selectedFile.name);
      }
      if (response.data.duplicate_detected) {
        setDuplicateNotice(response.data.message);
      } else {
        setDuplicateNotice(null);
      }
      if (response.data.cleaning_stats) {
        setCleaningStats(response.data.cleaning_stats);
        sessionStorage.setItem('analytics_cleaning_stats', JSON.stringify(response.data.cleaning_stats));
      } else {
        setCleaningStats(null);
        sessionStorage.removeItem('analytics_cleaning_stats');
      }
      fetchStats(response.data.dataset_id);
      setResults(null);
      setMiningStatus('idle');
      sessionStorage.removeItem('analytics_results');
    } catch (err) {
      setUploadStatus('error');
      sessionStorage.removeItem('analytics_file_name');
      sessionStorage.removeItem('analytics_cleaning_stats');
      console.error(err);
    }
  };




  const handleClearSession = async () => {
    try {
      await axios.post(`${API_BASE}/clear`);
      setFile(null);
      setUploadStatus('idle');
      setDuplicateNotice(null);
      setResults(null);
      setMiningStatus('idle');
      setCleaningStats(null);
      sessionStorage.removeItem('analytics_file_name');
      sessionStorage.removeItem('analytics_cleaning_stats');
      sessionStorage.removeItem('analytics_results');
      setStats({
        active: false,
        total_transactions: 0,
        unique_items_count: 0,
        top_items: [],
        all_items: [],
        recommended_algorithm: 'None'
      });
    } catch (err) {
      console.error('Error clearing session:', err);
    }
  };

  const runMining = async () => {
    setMiningStatus('mining');
    try {
      const payload = {
        ...params,
        min_support: parseFloat(params.min_support) || 0.05,
        min_confidence: parseFloat(params.min_confidence) || 0.5,
        min_lift: parseFloat(params.min_lift) || 1.0,
        dataset_id: datasetId
      };
      const response = await axios.post(`${API_BASE}/mine`, payload);
      setResults(response.data);
      sessionStorage.setItem('analytics_results', JSON.stringify(response.data));
      setMiningStatus('success');
    } catch (err) {
      setMiningStatus('error');
      console.error(err);
    }
  };

  // Removed automatic execution of mining algorithm upon stats.active change

  // Filter products in stats table
  const filteredItems = (stats.all_items || []).filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGroupedItemsets = () => {
    if (!results || !results.frequent_itemsets) return [];

    const groups = {};
    results.frequent_itemsets.forEach(set => {
      const size = set.items.length;
      if (!groups[size]) {
        groups[size] = [];
      }
      groups[size].push(set);
    });

    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)
      .map(size => ({
        size,
        label: size === 1 ? 'Single Products (1-Item Sets)' :
          size === 2 ? 'Product Pairs (2-Item Sets)' :
            size === 3 ? 'Product Trios (3-Item Sets)' :
              `Product Groups of ${size} (${size}-Item Sets)`,
        items: groups[size]
      }));
  };

  const groupedSets = getGroupedItemsets();


  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Rule Mining Center</h1>
          <p className="page-subtitle">Configure parameters, view product frequencies, and generate association rules.</p>
          {datasetId && activeDatasetName && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginTop: '0.5rem'
            }}>
              <span>Active Dataset:</span>
              <span className="mono" style={{ color: '#fff', fontWeight: '600' }}>{activeDatasetName}</span>
              <span style={{ color: 'var(--text-dim)', opacity: 0.5 }}>|</span>
              <Link to="/history" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '600' }}>
                Change
              </Link>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {stats.active && (
            (miningStatus === 'success' || !!results) ? (
              <button
                className="btn btn-danger btn-action"
                onClick={handleClearSession}
              >
                <Trash2 size={18} /> Clear Session
              </button>
            ) : (
              <button
                className="btn btn-primary btn-action"
                onClick={runMining}
                disabled={miningStatus === 'mining'}
              >
                {miningStatus === 'mining' ? <RefreshCw size={18} className="spin" /> : <Play size={18} />}
                Run Algorithm
              </button>
            )
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '2rem' }}>
        {/* Left Column: Configuration Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={16} /> Data Setup
            </h3>

            <div className="form-group">
              <div
                style={{
                  border: '1px dashed var(--border-color)',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  height: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: file ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                  transition: 'var(--transition)',
                  marginBottom: '0.5rem',
                  width: '100%',
                  boxSizing: 'border-box',
                  overflow: 'hidden'
                }}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <input
                  type="file" id="file-upload" hidden
                  onChange={handleFileUpload}
                  accept=".csv, .xlsx, .xls"
                />
                <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', flexShrink: 0 }} />
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: file ? '#fff' : 'var(--text-muted)',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'center'
                }}>
                  {file ? file.name : 'Choose a CSV file'}
                </div>
              </div>


              <div style={{ minHeight: '20px', marginBottom: '0.5rem' }}>
                {(uploadStatus === 'success' || stats.active) && (
                  <div style={{ color: '#10b981', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600' }}>
                    <CheckCircle size={14} /> Ready to mine ({stats.total_transactions} transactions loaded)
                  </div>
                )}
                {duplicateNotice && (
                  <div style={{
                    marginTop: '0.5rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fbbf24',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    lineHeight: '1.4'
                  }}>
                    <strong>Reuse Detected:</strong> {duplicateNotice}
                  </div>
                )}
              </div>

              {uploadStatus === 'success' && cleaningStats && (
                <div style={{ marginTop: '0.5rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.6rem 0.75rem', borderRadius: '6px', fontSize: '0.7rem', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: '700', marginBottom: '0.25rem', color: '#fff' }}>Sanitization Details:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <span>Missing Rows Removed:</span>
                    <span className="mono" style={{ color: '#fff' }}>{cleaningStats.missing_values_removed}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Duplicate Entries Removed:</span>
                    <span className="mono" style={{ color: '#fff' }}>{cleaningStats.duplicate_items_removed}</span>
                  </div>
                </div>
              )}
            </div>


            {!stats.active && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '0.6rem' }}>
                  Please input first...
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '0 0 1rem 0', fontWeight: '500' }}>
                  Upload a CSV file
                </p>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Mining settings configured in <Link to="/settings" style={{ color: 'var(--primary-color)', textDecoration: 'underline', fontWeight: '600' }}>Settings</Link>
              </span>
            </div>
          </div>


          {/* Top 10 Sellers */}
          <div className="card fade-in">
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
              <TrendingUp size={16} /> Top 10 Sellers
            </h3>
            {!results ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1.5rem 0', fontStyle: 'italic' }}>
                No Data (Run algorithm to view top sellers)
              </div>
            ) : stats.top_items && stats.top_items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {stats.top_items.map((item, idx) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-muted)', width: '16px' }}>{idx + 1}.</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff' }}>{item.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Qty: {item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1rem 0', fontStyle: 'italic' }}>
                No Data
              </div>
            )}
          </div>
        </div>

        {/* Right Column: statistics and results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>

          <>
            {/* Customer Cart Insights */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '250px', maxHeight: '360px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Database size={18} style={{ color: 'var(--primary-color)' }} /> Customer Cart Insights
                  <span className="tooltip-container" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '0.25rem' }}>
                    <button
                      onClick={() => {
                        const nextState = !showCartDesc;
                        setShowCartDesc(nextState);
                        sessionStorage.setItem('show_cart_desc', nextState ? 'true' : 'false');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: showCartDesc ? 'var(--primary-color)' : 'var(--text-dim)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'all 0.2s ease',
                      }}
                      aria-label="Toggle description"
                    >
                      <HelpCircle size={16} />
                    </button>
                    <span className="tooltip-text" style={{ width: '140px', textAlign: 'center', bottom: '135%' }}>
                      {showCartDesc ? 'Hide Description' : 'Show Description'}
                    </span>
                  </span>
                </h3>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  Items: {stats.unique_items_count} | Transactions: {stats.total_transactions}
                </span>
              </div>

              {showCartDesc && (
                <div
                  className="fade-in"
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    lineHeight: '1.4'
                  }}
                >
                  💡 <strong>What is % of Total Carts?</strong> This shows how often a product makes it into a customer's shopping cart.
                </div>
              )}

              {/* Search filter for products */}
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Search"
                  className="input"
                  style={{ paddingLeft: '30px', paddingItem: '0.4rem', fontSize: '0.85rem', height: '36px' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!results}
                />
              </div>

              {/* Scrollable table container */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.1)',
                display: (!results || filteredItems.length === 0) ? 'flex' : 'block',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {!results ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1.5rem', fontStyle: 'italic' }}>
                    No Data (Run algorithm to view customer cart insights)
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '130px', padding: '1.5rem', textAlign: 'center' }}>
                    No matching products found.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>Product Name</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>% of Total Carts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(item => (
                        <tr key={item.name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#fff' }}>{item.name}</td>
                          <td className="mono" style={{ textAlign: 'right', padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>
                            <strong style={{ color: '#fff', fontWeight: '700' }}>{(item.support * 100).toFixed(1)}%</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Lower Panel: Rules Mining Results */}
            <div className="card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Zap size={24} style={{ color: 'var(--primary-color)' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Analysis Insights & Recommendations
                    <span className="tooltip-container" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '0.25rem' }}>
                      <button
                        onClick={() => {
                          const nextState = !showAnalysisDesc;
                          setShowAnalysisDesc(nextState);
                          sessionStorage.setItem('show_analysis_desc', nextState ? 'true' : 'false');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: showAnalysisDesc ? 'var(--primary-color)' : 'var(--text-dim)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          transition: 'all 0.2s ease',
                        }}
                        aria-label="Toggle description"
                      >
                        <HelpCircle size={16} />
                      </button>
                      <span className="tooltip-text" style={{ width: '140px', textAlign: 'center', bottom: '135%' }}>
                        {showAnalysisDesc ? 'Hide Description' : 'Show Description'}
                      </span>
                    </span>
                  </h3>
                </div>
                {results && (results.rules?.length > 0 || results.frequent_itemsets?.length > 0) && (
                  <button onClick={handleExportCSV} className="btn btn-secondary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem' }}>
                    <Download size={16} /> Export Report (CSV)
                  </button>
                )}
              </div>

              {/* Contextual Explanation Block */}
              {showAnalysisDesc && (
                activeSubTab === 'recommendations' ? (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    lineHeight: '1.5'
                  }}>
                    💡 <strong>What is Confidence?</strong> Confidence tells you how likely a customer is to buy a second product if they have already decided to buy a first product.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      lineHeight: '1.5'
                    }}>
                      💡 <strong>What is a Frequent Itemset?</strong> A Frequent Itemset is a group of products regularly bought together in a single shopping visit.
                    </div>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      lineHeight: '1.5'
                    }}>
                      💡 <strong>What is an N-Item Set?</strong> An N-item set is simply the number of products in that group (for example, a 1-item set contains single products, and a 2-item set contains pairs of products).
                    </div>
                  </div>
                )
              )}

              {/* Sub Tab Selector */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '1.5rem' }}>
                <button
                  onClick={() => setActiveSubTab('recommendations')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    border: 'none',
                    background: 'transparent',
                    color: activeSubTab === 'recommendations' ? 'var(--primary-color)' : 'var(--text-muted)',
                    borderBottom: activeSubTab === 'recommendations' ? '2px solid var(--primary-color)' : 'none',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  Recommendations ({results?.rules?.length || 0})
                </button>
                <button
                  onClick={() => setActiveSubTab('itemsets')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    border: 'none',
                    background: 'transparent',
                    color: activeSubTab === 'itemsets' ? 'var(--primary-color)' : 'var(--text-muted)',
                    borderBottom: activeSubTab === 'itemsets' ? '2px solid var(--primary-color)' : 'none',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  Frequent Itemsets ({results?.frequent_itemsets?.length || 0})
                </button>
              </div>

              <div style={{
                flex: 1,
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.1)',
                display: (!results || (activeSubTab === 'recommendations' && (!results.rules || results.rules.length === 0)) || (activeSubTab === 'itemsets' && groupedSets.length === 0)) ? 'flex' : 'block',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {!results ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center' }}>
                    <Database size={28} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>No Analysis Insights Generated</h4>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '400px', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      Run the algorithm using the button at the top right to process the dataset and generate rules/itemsets.
                    </p>
                  </div>
                ) : (
                  <>
                    {activeSubTab === 'recommendations' && (
                      <>
                        {results.rules && results.rules.length > 0 ? (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-muted)', width: '20%' }}>Frequently Bought Together</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-muted)', width: '20%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    Association Rule
                                    <div className="tooltip-container">
                                      <Info size={14} style={{ color: 'var(--text-dim)' }} />
                                      <span className="tooltip-text">
                                        "A → B" means customers who buy A are also likely to buy B.
                                      </span>
                                    </div>
                                  </div>
                                </th>
                                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: '600', color: 'var(--text-muted)', width: '15%' }}>Confidence</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-muted)', width: '25%' }}>Explanation & Details</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-muted)', width: '20%' }}>Strategic Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.rules.map((rule, idx) => {
                                const confidencePct = (rule.confidence * 100).toFixed(1);
                                const isHighConfidence = rule.confidence >= 0.8;
                                const isMediumConfidence = rule.confidence >= 0.5 && rule.confidence < 0.8;
                                const isLowConfidence = rule.confidence < 0.5;

                                let confidenceColor = '#ef4444';
                                if (isHighConfidence) confidenceColor = '#10b981';
                                else if (isMediumConfidence) confidenceColor = '#f59e0b';

                                let action = "Consider placing these items near each other.";
                                if (isHighConfidence) action = "Create a bundled offer or end-cap display combining these items.";
                                else if (isMediumConfidence) action = "Run a cross-promotional discount to encourage joint purchases.";

                                return (
                                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '1rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {rule.antecedents.map(item => (
                                          <span key={item} style={{ fontWeight: '600', color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                            {item}
                                          </span>
                                        ))}
                                        <span style={{ color: 'var(--text-dim)' }}>+</span>
                                        {rule.consequents.map(item => (
                                          <span key={item} style={{ fontWeight: '600', color: 'var(--primary-color)', background: 'rgba(229, 115, 77, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                            {item}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontWeight: '700' }}>
                                        <span style={{ color: '#fff' }}>{rule.antecedents.join(', ')}</span>
                                        <span style={{ color: 'var(--primary-color)' }}>→</span>
                                        <span style={{ color: '#fff' }}>{rule.consequents.join(', ')}</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                        <span style={{
                                          fontWeight: '700',
                                          fontSize: '1rem',
                                          color: confidenceColor
                                        }}>
                                          {confidencePct}%
                                        </span>
                                        <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                                          <div style={{
                                            width: `${confidencePct}%`,
                                            height: '100%',
                                            background: confidenceColor
                                          }} />
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                      <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                                        Out of every 100 customers who bought <span style={{ color: '#fff', fontWeight: '600' }}>{rule.antecedents.join(', ')}</span>, about <span style={{ color: confidenceColor, fontWeight: '700' }}>{Math.round(confidencePct)}</span> also purchased <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>{rule.consequents.join(', ')}</span>.
                                      </div>
                                      <button
                                        onClick={() => toggleRuleExpand(idx)}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: 'var(--primary-color)',
                                          cursor: 'pointer',
                                          fontSize: '0.75rem',
                                          fontWeight: '600',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.2rem',
                                          padding: 0,
                                          marginTop: '0.5rem',
                                          outline: 'none'
                                        }}
                                      >
                                        {expandedRules[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        {expandedRules[idx] ? 'Less Details' : 'More Details'}
                                      </button>
                                      {expandedRules[idx] && (
                                        <div style={{
                                          marginTop: '0.5rem',
                                          padding: '0.6rem 0.75rem',
                                          background: 'rgba(255, 255, 255, 0.02)',
                                          borderRadius: '6px',
                                          fontSize: '0.75rem',
                                          border: '1px solid var(--border-color)',
                                          color: 'var(--text-muted)',
                                          lineHeight: '1.4'
                                        }}>
                                          <strong style={{ color: '#fff' }}>Lift: {rule.lift.toFixed(2)}</strong>
                                          <div style={{ marginTop: '0.2rem' }}>
                                            Customers buy these products together {rule.lift.toFixed(2)} times more often than expected.
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                      <div style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        padding: '0.75rem',
                                        borderRadius: '6px',
                                        borderLeft: `3px solid ${confidenceColor}`,
                                        fontSize: '0.8rem',
                                        lineHeight: '1.4',
                                        color: '#fff'
                                      }}>
                                        {action}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '3rem', textAlign: 'center' }}>
                            <Database size={28} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
                            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>No Product Recommendations Found</h4>
                            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', fontSize: '0.85rem' }}>
                              No association rules were found. Try increasing the number of transactions or lowering the minimum support/confidence.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {activeSubTab === 'itemsets' && (
                      <>
                        {groupedSets.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.50rem', padding: '0.5rem' }}>
                            {groupedSets.map(group => (
                              <div key={group.size} style={{
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.01)',
                                overflow: 'hidden'
                              }}>
                                {/* Group Header */}
                                <div
                                  onClick={() => toggleGroupCollapse(group.size)}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    padding: '0.75rem 1rem',
                                    borderBottom: collapsedGroups[group.size] === false ? '1px solid var(--border-color)' : 'none',
                                    fontWeight: '700',
                                    color: 'var(--primary-color)',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    transition: 'background 0.2s'
                                  }}
                                >
                                  <span>{group.label} ({group.items.length})</span>
                                  <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                                    {collapsedGroups[group.size] !== false ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                  </span>
                                </div>

                                {/* Table */}
                                {collapsedGroups[group.size] === false && (
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                      <tr style={{ background: 'rgba(255, 255, 255, 0.01)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Frequent Itemset</th>
                                        <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-muted)' }}>Qty</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.items.map((set, idx) => {
                                        const count = Math.round(set.support * (stats.total_transactions || 0));
                                        return (
                                          <tr key={idx} style={{ borderBottom: idx < group.items.length - 1 ? '1px solid rgba(255, 255, 255, 0.03)' : 'none' }}>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {set.items.map(item => (
                                                  <span key={item} style={{ fontWeight: '600', color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                    {item}
                                                  </span>
                                                ))}
                                              </div>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', color: 'var(--primary-color)' }}>
                                              {count} times
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '3rem', textAlign: 'center' }}>
                            <Database size={28} style={{ color: 'var(--text-dim)', marginBottom: '1rem' }} />
                            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>No Frequent Itemsets Found</h4>
                            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', fontSize: '0.85rem' }}>
                              Adjust your Minimum Support threshold lower to capture frequent combinations.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
