import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Search, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import './App.css';

interface ApiKey {
  id: string;
  serviceName: string;
  keyName: string;
  value: string;
  createdAt: number;
}

const App: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>(() => {
    const saved = localStorage.getItem('api_vault_keys');
    if (!saved) return [];

    try {
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((k: Record<string, unknown>) => ({
        id: typeof k.id === 'string' ? k.id : crypto.randomUUID(),
        serviceName: (k.serviceName || k.name || 'Unknown') as string,
        keyName: (k.keyName || 'Unnamed Key') as string,
        value: (k.value || '') as string,
        createdAt: typeof k.createdAt === 'number' ? k.createdAt : Date.now()
      }));
    } catch (e) {
      console.error('Failed to parse keys', e);
      return [];
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('api_vault_keys', JSON.stringify(keys));
  }, [keys]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newKeyName || !newValue) return;

    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      serviceName: newServiceName,
      keyName: newKeyName,
      value: newValue,
      createdAt: Date.now()
    };

    setKeys([...keys, newKey]);
    setNewServiceName('');
    setNewKeyName('');
    setNewValue('');
    setIsModalOpen(false);
    showToast('Key added successfully!');
  };

  const deleteKey = (id: string) => {
    setKeys(keys.filter(k => k.id !== id));
    showToast('Key deleted');
  };

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
    showToast('Copied to clipboard!');
  };

  const toggleVisibility = (id: string) => {
    setShowValues(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredKeys = keys.filter(k => 
    k.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.keyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <ShieldCheck size={32} />
          <span>API Key Vault</span>
        </div>

        <div className="search-bar glass-panel">
          <Search size={18} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search by service or key name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={20} />
          Add Key
        </button>
      </header>

      <main>
        {filteredKeys.length === 0 ? (
          <div className="empty-state glass-panel">
            <Key size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>{searchQuery ? 'No keys match your search.' : 'No API keys stored yet. Add one to get started!'}</p>
          </div>
        ) : (
          <div className="keys-grid">
            {filteredKeys.map(key => (
              <div key={key.id} className="key-card glass-panel">
                <div className="key-info">
                  <span className="key-name">{key.keyName}</span>
                  <span className="service-name">{key.serviceName}</span>
                  <div className="key-value-container">
                    <code className="key-value">
                      {showValues[key.id] ? key.value : '••••••••••••••••'}
                    </code>
                    <button 
                      className="btn-icon" 
                      style={{ border: 'none', background: 'transparent' }}
                      onClick={() => toggleVisibility(key.id)}
                    >
                      {showValues[key.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="key-actions">
                  <button 
                    className="btn btn-icon"
                    title="Copy Key"
                    onClick={() => copyToClipboard(key.value)}
                  >
                    <Copy size={16} />
                  </button>
                  <button 
                    className="btn btn-icon"
                    title="Delete Key"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => deleteKey(key.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Key Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <form 
            className="modal glass-panel" 
            onClick={e => e.stopPropagation()}
            onSubmit={handleAddKey}
          >
            <h2>Add New API Key</h2>
            
            <div className="input-group">
              <label>Service Name</label>
              <input 
                type="text" 
                placeholder="e.g. OpenAI, AWS, Stripe" 
                value={newServiceName}
                onChange={e => setNewServiceName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="input-group">
              <label>Key Name</label>
              <input 
                type="text" 
                placeholder="e.g. Production Key, Dev Key" 
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>API Key</label>
              <input 
                type="text" 
                placeholder="Paste your key here" 
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                required
              />
            </div>

            <div className="key-actions" style={{ marginTop: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-icon"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Store Key
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
