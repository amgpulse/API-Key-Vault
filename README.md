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
cd key-vault
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

- This app stores keys **only in your browser's `localStorage`** — they are never sent to a server.
- Add any secrets to `.env` files (already git-ignored) or keep them out of version control entirely.
- Use environment variables or a dedicated secrets manager for anything shared across devices.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
