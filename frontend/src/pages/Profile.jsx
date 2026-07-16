import React from 'react';
import { 
  User, 
  Mail, 
  Briefcase, 
  Clock, 
  Calendar,
  Settings
} from 'lucide-react';

const Profile = ({ user }) => {
  const name = user?.name || 'Admin User';
  const email = user?.email || 'admin@ruleminer.ai';
  const role = user?.role || 'Lead Data Scientist';

  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">User Profile</h1>
        <p className="page-subtitle">Manage your account information and view activity history.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '20px', 
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              margin: '0 auto 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '2.5rem',
              fontWeight: 'bold'
            }}>
              {initials}
            </div>
            <h2 style={{ fontWeight: '700', fontSize: '1.25rem' }}>{name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{role}</p>
            <button className="btn btn-secondary" style={{ width: '100%' }}>
              <Settings size={18} /> Edit Profile
            </button>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>Contact Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                <Mail size={16} color="var(--text-muted)" />
                {email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                <Briefcase size={16} color="var(--text-muted)" />
                {role}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                <Calendar size={16} color="var(--text-muted)" />
                Joined March 2026
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: '600', marginBottom: '1.5rem' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { action: 'Executed FP-Growth Pattern Finding', target: 'groceries_v2.csv', time: '2 hours ago', status: 'success' },
              { action: 'Exported Analytics Report', target: 'Monthly Analysis.pdf', time: '5 hours ago', status: 'success' },
              { action: 'Uploaded New Dataset', target: 'sales_q2_2026.xlsx', time: '1 day ago', status: 'success' },
              { action: 'Changed Pattern Finding Parameters', target: 'Min How Common This Is: 0.05', time: '2 days ago', status: 'info' },
              { action: 'Login from new device', target: 'Chrome on Windows', time: '3 days ago', status: 'warning' },
            ].map((item, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1rem', 
                background: 'var(--bg-color)', 
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    padding: '0.5rem', 
                    borderRadius: '8px', 
                    background: item.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                    color: item.status === 'success' ? '#10b981' : '#6366f1'
                  }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{item.action}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.target}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.time}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1.5rem' }}>View All Activity</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
