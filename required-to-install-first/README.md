# Required Software — Install These First

OfficeStream needs **two things** installed on your computer before it can run.
Follow this guide step by step.

---

## Quick Way (Automatic Download)

**Double-click `download-installers.bat`** — it will automatically download both installers into a `downloads/` folder. Then install them in order.

---

## Manual Way

If the script doesn't work, download manually:

| Software | Download Link | Version |
|----------|--------------|---------|
| **Node.js** | https://nodejs.org/en/download | v20 LTS or higher |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop/ | Latest |

---

## Step 1: Install Node.js

Node.js runs the OfficeStream server and frontend.

1. Run the **Node.js installer** (`.msi` file)
2. Click **Next** through all steps (keep defaults)
3. Make sure **"Add to PATH"** is checked (it is by default)
4. Click **Install** → **Finish**

**Verify it worked:** Open a terminal (Command Prompt or PowerShell) and type:
```
node --version
```
You should see something like `v20.19.0`. If you see an error, restart your terminal.

---

## Step 2: Install Docker Desktop

Docker runs the video/recording infrastructure (LiveKit, Egress, Redis).

1. Run the **Docker Desktop installer** (`.exe` file)
2. Click **Install** (accept defaults)
3. **Important:** If it asks to enable WSL 2, click **Yes**
4. **Restart your computer** if prompted (this is required for WSL 2)
5. After restart, **open Docker Desktop** from the Start menu
6. Wait until the Docker icon in the system tray shows **"Docker Desktop is running"**
   - First launch takes 1-2 minutes to initialize
   - You may need to accept the Docker license agreement

**Verify it worked:** Open a terminal and type:
```
docker --version
```
You should see something like `Docker version 29.x.x`. If you see an error:
- Make sure Docker Desktop is open and running
- Try restarting Docker Desktop
- If it says "WSL 2 not installed", restart your computer

---

## Step 3: Run OfficeStream

Now go back to the main **OfficeStream** folder and open a terminal there.

```bash
# Install all dependencies (only needed once)
npm install

# Create the default admin account (only needed once)
npm run seed

# Start everything!
npm run dev
```

Wait about 15 seconds, then open **http://localhost:3000** in your browser.

### Login with:
- **Email:** admin@officestream.com
- **Password:** admin123

---

## What Each Software Does

### Why Node.js?
Node.js is the JavaScript runtime that powers:
- The **backend server** (Express API on port 5000)
- The **frontend** (Next.js on port 3000)
- Package management (`npm install`, `npm run dev`)

### Why Docker Desktop?
Docker runs three services in containers:
- **LiveKit Server** — Routes video/audio between users (WebRTC)
- **LiveKit Egress** — Records meetings into MP4 files using headless Chrome
- **Redis** — Message bus that lets LiveKit and Egress communicate

Without Docker, video calls and recording won't work.

---

## Troubleshooting

### "node is not recognized"
→ Restart your terminal after installing Node.js. If still failing, reinstall Node.js and make sure "Add to PATH" is checked.

### "docker is not recognized"
→ Make sure Docker Desktop is open and running. Restart your terminal.

### Docker says "WSL 2 not installed" or "Virtual Machine Platform not enabled"
→ Restart your computer. If still failing:
1. Open PowerShell **as Administrator**
2. Run: `wsl --install`
3. Restart your computer again

### Docker engine won't start
→ Make sure virtualization is enabled in your BIOS:
1. Restart computer → press F2/F12/DEL to enter BIOS
2. Find "Virtualization Technology" or "Intel VT-x" or "AMD-V"
3. Enable it → Save and exit

### "port 7880 already in use"
→ Another LiveKit server is running. Close it:
```
taskkill /f /im livekit-server.exe
```

### npm install fails
→ Make sure you're in the `OfficeStream` folder (not `required-to-install-first`). Try:
```
cd ..
npm install
```

---

## System Requirements

- **OS:** Windows 10/11 (64-bit)
- **RAM:** 8 GB minimum (16 GB recommended)
- **Disk:** 2 GB free space
- **CPU:** Must support virtualization (most modern CPUs do)
- **Browser:** Chrome, Edge, or Firefox (for WebRTC support)
