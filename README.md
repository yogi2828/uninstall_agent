# SysClean Enterprise - Automated Remote Application Uninstaller & Deep Trace Purger

> **Automated, authenticated remote application uninstallation and residual trace cleaning system driven via secure email links, custom URI protocol handlers, and enterprise desktop helper agents.**

---

## 🔒 Operating System & Browser Security Architecture

Standard web browsers (Chrome, Edge, Firefox, Safari) operate inside isolated security sandboxes. For safety reasons, **a web page loaded from an email link cannot directly access the local operating system to delete files or run uninstaller executables**.

To accomplish safe, authenticated remote uninstallation:
1. **Web Dashboard & API**: The administrator selects a device and target application, generating a cryptographically signed, single-use **JWT action token**.
2. **Email Magic Trigger**: An email notification is sent with a unique trigger URL (`https://your-domain.com/api/uninstall/trigger-web?token=...`).
3. **Custom Protocol Scheme (`sysclean://`)**: Clicking the link opens a browser launcher that invokes `sysclean://uninstall?token=...`.
4. **Desktop Helper Agent**: The local agent validates the token against the remote server API, executes the uninstallation binary, cleans up residual `%AppData%`, `%LocalAppData%`, `%Temp%`, and registry traces, and posts live status updates back to the dashboard.

---

## 📁 Repository Structure

```text
├── server/                      # Management Server & Web Dashboard
│   ├── index.js                 # Express API server (JWT signing, token verification, job status)
│   ├── package.json             # Server dependencies (express, jsonwebtoken, cors)
│   └── public/
│       └── index.html           # Sleek, glassmorphic Web Dashboard UI
│
├── client-agent/                # Desktop Agent & Trace Purger
│   ├── agent.js                 # Desktop daemon (verifies token & executes uninstallation steps)
│   ├── cleaner.js               # Deep trace removal module (AppData, Temp, Logs, Registry)
│   ├── register-protocol.js     # Windows registry script binding sysclean:// to agent.js
│   ├── test-flow.js             # Automated end-to-end test script
│   └── package.json             # Agent package configuration
│
└── README.md                    # System documentation & free hosting guide
```

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js** (v16+ installed)
- **Windows OS** (for native registry protocol registration; macOS/Linux supported for API and daemon testing)

### Step 1: Install Dependencies

Open your terminal in the root directory and install server dependencies:

```bash
cd server
npm install
```

### Step 2: Register Custom Protocol Handler (`sysclean://`)

To enable email links to automatically launch the Desktop Agent on your machine, navigate into `client-agent` and register the `sysclean://` URI scheme in Windows Registry:

```bash
# Navigate to client-agent directory first
cd client-agent

# Execute registry registration script
node register-protocol.js
```

> ⚠️ **Important Directory Note**: `register-protocol.js` is located inside the `client-agent/` folder. If you run `node register-protocol.js` from the root project directory `D:\New folder\`, Node.js will throw `MODULE_NOT_FOUND`. Always change directory into `client-agent` first (`cd client-agent`).

### Step 3: Start the Management Server

Start the Express API server and Web Dashboard:

```bash
cd ../server
npm start
```

You will see:
```text
[SysClean Management Server] Running on http://localhost:3000
```

### Step 4: Open the Web Dashboard

Open your web browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

### Step 5: Test the Workflow (Manual & Automated)

#### Option A: Interactive Web UI Test
1. In the Web Dashboard, select a managed host device (e.g. `DESKTOP-PRO-EXPRESS`).
2. Select an installed target application (e.g. `Legacy Toolbar Sync`).
3. Choose your desired **Trace Cleanup Depth** (`Standard`, `Deep Purge`, or `Forensic`).
4. Click **🚀 Generate & Dispatch Uninstall Email Link**.
5. In the **Active Uninstall Jobs** panel on the right, click **📨 Simulate Link Click**.
6. Watch the live log stream update in real-time as the agent validates the token, uninstalls the app, and purges trace directories!

#### Option B: Automated Test Script
Run the included end-to-end test script:

```bash
cd client-agent
node test-flow.js
```

---

## 🌐 How to Host the Web Application Freely

You can deploy the **SysClean Management Server & Web Dashboard** for free on multiple cloud hosting platforms.

---

### Option 1: Hosting on Render.com (Recommended - 100% Free)

**Render** provides free web service hosting for Node.js Express applications.

#### Steps to Deploy on Render:
1. Push this repository to **GitHub** or **GitLab**.
2. Sign up at [Render.com](https://render.com/).
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Fill in the build settings:
   - **Name**: `sysclean-management-server`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: `Free`
6. Click **Advanced** and add Environment Variables:
   - `JWT_SECRET` = `your-secure-random-secret-key`
   - `PORT` = `10000`
7. Click **Create Web Service**.

Once deployed, Render will provide a free live URL (e.g. `https://sysclean-server.onrender.com`).

---

### Option 2: Hosting on Koyeb (Free Tier)

**Koyeb** provides high-performance free hosting for Web Services.

1. Create a free account on [Koyeb.com](https://www.koyeb.com/).
2. Create a **New App** -> **GitHub**.
3. Select your repository and set the **Work Directory** to `/server`.
4. Set Build Command to `npm install` and Run Command to `node index.js`.
5. Deploy to receive your free SSL URL (e.g. `https://sysclean-app.koyeb.app`).

---

### Option 3: Hosting Frontend on Vercel & Backend on Render

If you prefer using Vercel for frontend hosting:

1. **Deploy Backend (`server/index.js`)** to Render or Koyeb (as shown in Option 1).
2. **Deploy Frontend (`server/public/index.html`)** to Vercel:
   - In `index.html`, update `fetch('/api/...')` endpoints to point to your live Render backend URL (e.g. `https://sysclean-server.onrender.com/api/...`).
   - Import `server/public` into Vercel as a Static Site.

---

## 🔧 Configuring Desktop Agents for Remote Cloud Host

When running the client agent against a cloud-hosted server (e.g., Render or Koyeb):

1. **Set Environment Variable**:
   ```bash
   # Windows PowerShell
   $env:SERVER_URL="https://sysclean-server.onrender.com"
   node agent.js sysclean://uninstall?token=YOUR_TOKEN
   ```

2. **Or Update Default URL in `client-agent/agent.js`**:
   ```javascript
   const SERVER_URL = process.env.SERVER_URL || 'https://sysclean-server.onrender.com';
   ```

---

## 🛡️ Security Best Practices

- **Token Expiration**: All uninstall links generated by SysClean expire after 24 hours.
- **Path Traversal Protection**: `cleaner.js` enforces path guardrails refusing deletion of critical OS directories (such as `C:\Windows` or `System32`).
- **Single-Use Enforcement**: Tokens are invalidated once reported as `Completed`.

---

## 📄 License
MIT License. Built for enterprise remote software management and automated endpoint maintenance.
