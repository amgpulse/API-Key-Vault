import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Key,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import {
  createVault,
  decryptVault,
  encryptVault,
  isEncryptedVault,
  saveEncryptedVault,
  type ApiKey,
  type EncryptedVault
} from './vaultCrypto';
import './App.css';

type VaultState =
  | { kind: 'setup'; legacyKeys: ApiKey[] }
  | { kind: 'locked'; vault: EncryptedVault }
  | { kind: 'unavailable'; message: string }
  | { kind: 'unlocked'; vault: EncryptedVault };

function normalizeLegacyKeys(value: unknown): ApiKey[] {
  if (!Array.isArray(value)) {
    throw new Error('Stored data is not a key list.');
  }

  return value.map((item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error('Stored key data is invalid.');
    }

    const key = item as Record<string, unknown>;
    const serviceName = key.serviceName ?? key.name ?? 'Unknown';
    const keyName = key.keyName ?? 'Unnamed Key';
    const secret = key.value ?? '';
    const createdAt = key.createdAt ?? Date.now();

    if (
      typeof serviceName !== 'string' ||
      typeof keyName !== 'string' ||
      typeof secret !== 'string' ||
      typeof createdAt !== 'number' ||
      !Number.isFinite(createdAt) ||
      (key.id !== undefined && typeof key.id !== 'string')
    ) {
      throw new Error('Stored key data is invalid.');
    }

    return {
      id: typeof key.id === 'string' && key.id ? key.id : crypto.randomUUID(),
      serviceName,
      keyName,
      value: secret,
      createdAt
    };
  });
}

function loadVault(): VaultState {
  let saved: string | null;

  try {
    saved = localStorage.getItem('api_vault_keys');
  } catch {
    return {
      kind: 'unavailable',
      message: 'Browser storage is unavailable. Enable site storage and reload.'
    };
  }

  if (saved === null) {
    return { kind: 'setup', legacyKeys: [] };
  }

  try {
    const parsed: unknown = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return { kind: 'setup', legacyKeys: normalizeLegacyKeys(parsed) };
    }
    if (isEncryptedVault(parsed)) {
      return { kind: 'locked', vault: parsed };
    }
  } catch {
    // Invalid or damaged storage is shown as unavailable below; it is never overwritten.
  }

  return {
    kind: 'unavailable',
    message: 'Vault data is invalid or damaged. It has not been changed.'
  };
}

const App: React.FC = () => {
  const [vault, setVault] = useState<VaultState>(loadVault);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [activeKey, setActiveKey] = useState<CryptoKey | null>(null);
  const [salt, setSalt] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleVaultAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsBusy(true);

    try {
      if (vault.kind === 'setup') {
        if (password.length < 12) {
          throw new Error('Use a master password with at least 12 characters.');
        }
        if (password !== passwordConfirm) {
          throw new Error('The master passwords do not match.');
        }

        const created = await createVault(vault.legacyKeys, password);
        saveEncryptedVault(created.vault);
        setKeys(vault.legacyKeys);
        setActiveKey(created.key);
        setSalt(created.vault.salt);
        setVault({ kind: 'unlocked', vault: created.vault });
        setPassword('');
        setPasswordConfirm('');
      } else if (vault.kind === 'locked') {
        const opened = await decryptVault(vault.vault, password);
        setKeys(opened.keys);
        setActiveKey(opened.key);
        setSalt(vault.vault.salt);
        setVault({ kind: 'unlocked', vault: vault.vault });
        setPassword('');
      }
    } catch (cause) {
      if (vault.kind === 'locked') {
        setError('Could not decrypt the vault. The password may be incorrect or the data may be damaged.');
      } else {
        setError(cause instanceof Error ? cause.message : 'Unable to create the vault.');
      }
    } finally {
      setIsBusy(false);
    }
  };

  const persistKeys = async (updatedKeys: ApiKey[]): Promise<boolean> => {
    if (!activeKey || !salt) {
      setError('The vault is locked. Unlock it before making changes.');
      return false;
    }

    try {
      const encrypted = await encryptVault(updatedKeys, activeKey, salt);
      saveEncryptedVault(encrypted);
      setKeys(updatedKeys);
      setVault({ kind: 'unlocked', vault: encrypted });
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save encrypted vault data.');
      return false;
    }
  };

  const handleAddKey = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newServiceName.trim() || !newKeyName.trim() || !newValue) return;

    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      serviceName: newServiceName.trim(),
      keyName: newKeyName.trim(),
      value: newValue,
      createdAt: Date.now()
    };

    setError(null);
    const saved = await persistKeys([...keys, newKey]);
    if (!saved) return;
    setNewServiceName('');
    setNewKeyName('');
    setNewValue('');
    setIsModalOpen(false);
    showToast('Key added and encrypted.');
  };

  const deleteKey = async (id: string) => {
    setError(null);
    if (await persistKeys(keys.filter(key => key.id !== id))) {
      showToast('Key deleted.');
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast('Copied to clipboard.');
    } catch {
      setError('Clipboard access failed. Check your browser permissions and HTTPS connection.');
    }
  };

  const lockVault = () => {
    setKeys([]);
    setActiveKey(null);
    setSalt(null);
    setShowValues({});
    setIsModalOpen(false);
    setNewValue('');
    setPassword('');
    setPasswordConfirm('');
    setSearchQuery('');
    if (vault.kind === 'unlocked') {
      setVault({ kind: 'locked', vault: vault.vault });
    }
  };

  if (vault.kind !== 'unlocked') {
    const isSetup = vault.kind === 'setup';

    return (
      <div className="container">
        <main className="vault-gate glass-panel">
          <div className="logo">
            <ShieldCheck size={32} />
            <span>API Key Vault</span>
          </div>

          {vault.kind === 'unavailable' ? (
            <div role="alert" className="gate-message">
              <h1>Vault unavailable</h1>
              <p>{vault.message}</p>
              <p>
                If you have a backup, restore it before clearing this browser&apos;s site data.
              </p>
            </div>
          ) : (
            <>
              <div className="gate-message">
                <h1>{isSetup ? 'Create your encrypted vault' : 'Unlock your vault'}</h1>
                <p>
                  {isSetup
                    ? vault.legacyKeys.length > 0
                      ? `${vault.legacyKeys.length} existing key(s) will be encrypted with your master password.`
                      : 'Choose a strong master password to encrypt keys stored in this browser.'
                    : 'Enter your master password to decrypt keys in this browser.'}
                </p>
              </div>
              <form className="gate-form" onSubmit={handleVaultAccess}>
                <div className="input-group">
                  <label htmlFor="master-password">Master password</label>
                  <input
                    id="master-password"
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    autoComplete={isSetup ? 'new-password' : 'current-password'}
                    autoFocus
                    required
                    minLength={isSetup ? 12 : undefined}
                  />
                </div>
                {isSetup && (
                  <div className="input-group">
                    <label htmlFor="confirm-password">Confirm master password</label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={passwordConfirm}
                      onChange={event => setPasswordConfirm(event.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={12}
                    />
                  </div>
                )}
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="btn btn-primary gate-submit" type="submit" disabled={isBusy}>
                  <LockKeyhole size={18} />
                  {isBusy ? 'Working…' : isSetup ? 'Encrypt and open vault' : 'Unlock vault'}
                </button>
              </form>
              <p className="security-note">
                Your master password cannot be recovered. This vault is encrypted in this browser
                and is not synced or backed up automatically.
              </p>
            </>
          )}
        </main>
      </div>
    );
  }

  const filteredKeys = keys.filter(key =>
    key.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.keyName.toLowerCase().includes(searchQuery.toLowerCase())
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
            aria-label="Search keys"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            Add Key
          </button>
          <button className="btn btn-icon" onClick={lockVault} title="Lock vault">
            <LockKeyhole size={18} />
            <span>Lock</span>
          </button>
        </div>
      </header>

      <main>
        {error && <p className="form-error page-error" role="alert">{error}</p>}
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
                      onClick={() => setShowValues(previous => ({
                        ...previous,
                        [key.id]: !previous[key.id]
                      }))}
                      aria-label={showValues[key.id] ? 'Hide API key' : 'Reveal API key'}
                    >
                      {showValues[key.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="key-actions">
                  <button
                    className="btn btn-icon"
                    title="Copy key"
                    aria-label="Copy key"
                    onClick={() => void copyToClipboard(key.value)}
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="btn btn-icon"
                    title="Delete key"
                    aria-label="Delete key"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => void deleteKey(key.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <form
            className="modal glass-panel"
            onClick={event => event.stopPropagation()}
            onSubmit={event => void handleAddKey(event)}
          >
            <h2>Add New API Key</h2>
            <div className="input-group">
              <label htmlFor="service-name">Service Name</label>
              <input
                id="service-name"
                type="text"
                placeholder="e.g. OpenAI, AWS, Stripe"
                value={newServiceName}
                onChange={event => setNewServiceName(event.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="key-name">Key Name</label>
              <input
                id="key-name"
                type="text"
                placeholder="e.g. Production Key, Dev Key"
                value={newKeyName}
                onChange={event => setNewKeyName(event.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="key-value">API Key</label>
              <input
                id="key-value"
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste your key here"
                value={newValue}
                onChange={event => setNewValue(event.target.value)}
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
                Encrypt and store
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="toast glass-panel" role="status">
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
