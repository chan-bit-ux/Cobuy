import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, 
  Trash2, 
  Info,
  Database,
  History
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const Dataset = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/datasets`);
      setDatasets(response.data.datasets || []);
    } catch (err) {
      console.error("Error fetching datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const totalTransactions = datasets.reduce((sum, ds) => sum + (ds.transaction_count || 0), 0);
  const uniqueItemsMax = datasets.length > 0 ? Math.max(...datasets.map(ds => ds.unique_items || 0)) : 0;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dataset Management</h1>
          <p className="page-subtitle">View, manage, and verify your transaction source files.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-label">Total Transactions Loaded</div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>{totalTransactions.toLocaleString()}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Files Processed</div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>{datasets.length}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Niche Domains</div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>{datasets.length > 0 ? 'Active' : 'None'}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Unique Items (Max)</div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>{uniqueItemsMax}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontWeight: '700', fontSize: '1.25rem' }}>File Inventory</h3>
            <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={fetchDatasets}>
              <History size={16} /> Refresh list
            </button>
          </div>

          <div className="table-container">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading file inventory...</div>
            ) : datasets.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Database size={32} style={{ marginBottom: '1rem', color: 'var(--text-dim)' }} />
                <div>No datasets uploaded yet. Upload a CSV file in the Rule Mining Center or load a template.</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Upload Date</th>
                    <th>Transactions</th>
                    <th>Unique Items</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((ds, idx) => (
                    <tr key={ds.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <FileText size={18} style={{ color: idx === 0 ? 'var(--primary-color)' : 'var(--text-dim)' }} />
                          <span style={{ fontWeight: idx === 0 ? '700' : '500', color: '#fff' }}>{ds.name}</span>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>{ds.upload_date}</td>
                      <td className="mono" style={{ fontWeight: '600' }}>{(ds.transaction_count || 0).toLocaleString()}</td>
                      <td className="mono">{(ds.unique_items || 0)}</td>
                      <td>
                        <span style={{ 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '100px', 
                          fontSize: '0.7rem', 
                          fontWeight: '700',
                          background: idx === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          color: idx === 0 ? '#10b981' : 'var(--text-muted)'
                        }}>
                          {idx === 0 ? 'Active' : 'Archived'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} /> Why use Datasets?
            </h3>
            <p className="help-text" style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
              Ang **Dataset** page ay nagsisilbing storage room ng iyong business data. Dito mo makikita ang mga listahan ng resibo na in-upload mo para sa analysis.
            </p>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div style={{ color: 'var(--primary-color)' }}>●</div>
                <div><strong>Data Audit:</strong> Para ma-double check kung tama ang format ng items (e.g. Bread vs. White Bread).</div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div style={{ color: 'var(--primary-color)' }}>●</div>
                <div><strong>History:</strong> Para ma-compare ang sales patterns noon (last month) vs. ngayon.</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <h3 style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '1rem', color: '#fff' }}>Recommended Format</h3>
            <div style={{ background: '#000', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem' }} className="mono">
              <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>// CSV Structure</div>
              <div style={{ color: '#fff' }}>TransactionID, Item</div>
              <div style={{ color: '#888' }}>1, Bread</div>
              <div style={{ color: '#888' }}>1, Milk</div>
              <div style={{ color: '#888' }}>2, Coffee</div>
            </div>
            <p className="help-text" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
              Siguraduhin na ang TransactionID ay pareho para sa mga items na binili ng sabay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dataset;
