import React, { useState } from 'react';
import { 
  Shield, 
  Bell, 
  Globe, 
  Database,
  Sliders,
  Check
} from 'lucide-react';

const Settings = () => {
  const [params, setParams] = useState(() => {
    const saved = sessionStorage.getItem('analytics_params');
    return saved ? JSON.parse(saved) : {
      min_support: 0.05,
      min_confidence: 0.5,
      min_lift: 1.0,
      algorithm: 'auto'
    };
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    sessionStorage.setItem('analytics_params', JSON.stringify(params));
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  const handleReset = () => {
    const defaultParams = {
      min_support: 0.05,
      min_confidence: 0.5,
      min_lift: 1.0,
      algorithm: 'auto'
    };
    setParams(defaultParams);
    sessionStorage.setItem('analytics_params', JSON.stringify(defaultParams));
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">System Settings</h1>
        <p className="page-subtitle">Manage mining parameters, notifications, and application preferences.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="nav-link active" style={{ marginBottom: '0.5rem' }}>
            <Sliders size={20} /> General Preferences
          </div>
          <div className="nav-link" style={{ marginBottom: '0.5rem' }}>
            <Bell size={20} /> Notifications
          </div>
          <div className="nav-link" style={{ marginBottom: '0.5rem' }}>
            <Shield size={20} /> Security & Privacy
          </div>
          <div className="nav-link" style={{ marginBottom: '0.5rem' }}>
            <Database size={20} /> Data Management
          </div>
          <div className="nav-link">
            <Globe size={20} /> API Access
          </div>
        </div>

        <div className="card" style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>General Preferences</h2>
              <p className="help-text">Configure default behaviors and specialization settings for your workspace.</p>
            </div>
            {saveSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '600',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <Check size={16} /> Saved Successfully
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label className="label">Target Business Domain</label>
            <select className="select" defaultValue="Custom / Multi-retail">
              <option>Convenience Store</option>
              <option>Pet Shop</option>
              <option>Coffee Shop</option>
              <option>Custom / Multi-retail</option>
            </select>
            <p className="help-text">Specializes the recommendation engine and UI for the selected niche.</p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', margin: '2rem 0', paddingTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem', color: 'var(--primary-color)' }}>Association Rule Mining Defaults</h3>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                <span>Minimum Support (Min Support):</span>
                <span className="mono" style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
                  {(params.min_support * 100).toFixed(1)}%
                </span>
              </label>
              <input
                type="range"
                min="0.001"
                max="0.5"
                step="0.005"
                value={params.min_support}
                onChange={(e) => setParams({ ...params, min_support: parseFloat(e.target.value) })}
                style={{
                  width: '100%',
                  accentColor: 'var(--primary-color)',
                  cursor: 'pointer'
                }}
              />
              <p className="help-text">Filters out items/patterns that occur less frequently than this percentage threshold in the overall dataset.</p>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                <span>Minimum Confidence (Min Confidence):</span>
                <span className="mono" style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
                  {(params.min_confidence * 100).toFixed(0)}%
                </span>
              </label>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={params.min_confidence}
                onChange={(e) => setParams({ ...params, min_confidence: parseFloat(e.target.value) })}
                style={{
                  width: '100%',
                  accentColor: 'var(--primary-color)',
                  cursor: 'pointer'
                }}
              />
              <p className="help-text">Filters out rules where the probability of purchasing the consequent item(s) given the antecedent item(s) is lower than this threshold.</p>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                <span>Minimum Lift (Min Lift):</span>
                <span className="mono" style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
                  {(!isNaN(parseFloat(params.min_lift)) ? parseFloat(params.min_lift) : 1.0).toFixed(1)}
                </span>
              </label>
              <input
                type="number"
                min="1.0"
                max="10.0"
                step="0.1"
                className="input"
                value={params.min_lift}
                onChange={(e) => setParams({ ...params, min_lift: e.target.value })}
                onBlur={() => {
                  const parsed = parseFloat(params.min_lift);
                  if (isNaN(parsed) || parsed < 1.0) {
                    setParams({ ...params, min_lift: 1.0 });
                  }
                }}
                style={{
                  width: '100%',
                  fontSize: '0.95rem',
                  padding: '0.6rem 0.8rem',
                  backgroundColor: '#141414'
                }}
              />
              <p className="help-text">Filters out rules where the items have low strength of association (Lift &gt; 1.0 means items are bought together more often than expected by random chance).</p>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="label" style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>Default Mining Algorithm</label>
              <select
                className="select"
                value={params.algorithm}
                onChange={(e) => setParams({ ...params, algorithm: e.target.value })}
                style={{
                  fontSize: '0.95rem',
                  padding: '0.6rem 0.8rem',
                  backgroundColor: '#141414'
                }}
              >
                <option value="auto">Auto-select (Intelligent Choice)</option>
                <option value="apriori">Apriori</option>
                <option value="fpgrowth">FP-Growth</option>
              </select>
              <p className="help-text">Choose 'Auto-select' to let the system automatically choose Apriori for smaller datasets and FP-Growth for larger ones.</p>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
            <button className="btn btn-primary" onClick={handleSave} style={{ padding: '0.875rem 2rem' }}>Save Changes</button>
            <button className="btn btn-secondary" onClick={handleReset} style={{ padding: '0.875rem 2rem' }}>Reset Defaults</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
