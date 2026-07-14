import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FileText, 
  Trash2, 
  History as HistoryIcon,
  Play,
  Database,
  Lock
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const Dataset = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const handleDeleteDataset = async (datasetId) => {
    try {
      await axios.delete(`${API_BASE}/datasets/${datasetId}`);
      setDatasets(datasets.filter(ds => ds.id !== datasetId));
    } catch (err) {
      console.error("Error deleting dataset:", err);
    }
  };

  const handleSelectFile = async (ds) => {
    try {
      await axios.post(`${API_BASE}/history/${ds.id}/activate`);
      localStorage.setItem('activeDatasetId', ds.id);
      localStorage.setItem('activeDatasetName', ds.name);
      navigate(`/analytics?dataset_id=${ds.id}`);
    } catch (err) {
      console.error("Error activating dataset:", err);
      localStorage.setItem('activeDatasetId', ds.id);
      localStorage.setItem('activeDatasetName', ds.name);
      navigate(`/analytics?dataset_id=${ds.id}`);
    }
  };

  const totalTransactions = datasets.reduce((sum, ds) => sum + (ds.transaction_count || 0), 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HistoryIcon size={28} className="text-primary" />
            File History
          </h1>
          <p className="page-subtitle">
            Private history of all files uploaded under your account. Click any file to look back and rerun analytics.
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="card stat-card">
          <div className="stat-label">Your Uploaded Files</div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>{datasets.length}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Total Historical Transactions</div>
          <div className="stat-value" style={{ fontSize: '1.8rem' }}>{totalTransactions.toLocaleString()}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Privacy Scope</div>
          <div className="stat-value" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: '700' }}>
            <Lock size={18} /> Account Owner Only
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '700', fontSize: '1.25rem' }}>Uploaded File History</h3>
          <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={fetchDatasets}>
            <HistoryIcon size={16} /> Refresh History
          </button>
        </div>

        <div className="history-scroll-box">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading your private file history...</div>
          ) : datasets.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Database size={36} style={{ marginBottom: '1rem', color: 'var(--text-dim)' }} />
              <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                No uploaded files in your history yet
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Files you upload under your account will appear here exclusively for you.
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#13151f', zIndex: 10, borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '1rem 1.5rem', width: '55%' }}>File Name</th>
                  <th style={{ textAlign: 'left', padding: '1rem 1.5rem', width: '30%' }}>Date Uploaded</th>
                  <th style={{ textAlign: 'center', padding: '1rem 1.5rem', width: '15%' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((ds) => (
                  <tr key={ds.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ textAlign: 'left', padding: '0.9rem 1.5rem' }}>
                      <div 
                        onClick={() => handleSelectFile(ds)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem',
                          cursor: 'pointer',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease',
                          width: 'fit-content'
                        }}
                        className="history-file-link"
                        title="Click to look back on this file and rerun analytics"
                      >
                        <FileText size={18} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                        <span style={{ fontWeight: '700', color: '#fff', textDecoration: 'underline', textUnderlineOffset: '4px' }}>
                          {ds.name}
                        </span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--primary-color)', 
                          background: 'rgba(99, 102, 241, 0.15)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '100px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontWeight: '600',
                          marginLeft: '0.5rem'
                        }}>
                          <Play size={10} fill="currentColor" /> Rerun Analytics
                        </span>
                      </div>
                    </td>
                    <td className="mono" style={{ textAlign: 'left', padding: '0.9rem 1.5rem', fontSize: '0.85rem' }}>
                      {ds.upload_date}
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.9rem 1.5rem' }}>
                      <button
                        onClick={() => handleDeleteDataset(ds.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          borderRadius: '6px',
                          transition: 'color 0.2s'
                        }}
                        title="Delete from History"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dataset;
