<div align="center">

# 🔐 API Key Vault

**A sleek, dark-themed UI to store, search, and manage all your API keys in one place.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

</div>

---

## ✨ Features

- 🗄️ **Centralized storage** — keep every API key in one clean, glassmorphic dashboard.
- 🔍 **Instant search** — filter keys by service or key name as you type.
- 👁️ **Toggle visibility** — reveal or hide key values on demand.
- 📋 **One-click copy** — copy any key straight to your clipboard.
- 🌙 **Modern dark UI** — glassmorphism styling with a dark, developer-friendly theme.
- 💾 **Persistent storage** — keys are saved locally in your browser (`localStorage`).

## 🛠️ Tech Stack

| Layer      | Technology                     |
| ---------- | ------------------------------ |
| UI         | React 19 + TypeScript          |
| Build tool | Vite                           |
| Icons      | lucide-react                   |
| Styling    | Custom CSS (glassmorphism)     |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (npm included)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/amgpulse/API-Key-Vault

# 2. Install dependencies
cd API-Key-Vault
npm install

# 3. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Production Build

```bash
npm run build      # type-check + build to dist/
npm run preview    # preview the production build locally
```

## 🔒 Security Note

> ⚠️ **Never commit real API keys, `.env` files, or credentials to this repository.**

- Keys are encrypted in the browser with AES-256-GCM. The encryption key is derived from your master password with PBKDF2-HMAC-SHA-256 (600,000 iterations); a fresh random IV is used for each save.
- The master password is never stored. If you forget it, the vault cannot be recovered.
- Existing plaintext data is encrypted when you first set a master password. Until then, the old data remains in browser storage.
- This protects stored data at rest, but does **not** protect against malicious browser extensions, compromised devices, XSS, or someone accessing an already-unlocked session. Lock the vault when you step away and use a strong, unique password.
- Data stays in this browser and is not synced or backed up. Export/backup support is not currently available; clearing browser site data can permanently delete your vault.
- Serve the app over HTTPS in production (localhost is also a secure context for browser cryptography). Do not use this app as a replacement for a managed secrets service for shared or production infrastructure.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
