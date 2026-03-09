# 🚀 BookEase Project - How to Run

## ✅ **CORRECT WAY TO RUN YOUR PROJECT**

### **Step 1: Navigate to Project Root**
```bash
# You're currently in: D:\realworkstudio\bookease\apps\web
# Navigate to root:
cd D:\realworkstudio\bookease
```

### **Step 2: Run Development Server**
```bash
# From project root (D:\realworkstudio\bookease)
pnpm run dev
```

**OR** (as the error message suggests):
```bash
pnpm -w run dev
```

---

## 📁 **PROJECT STRUCTURE**

```
D:\realworkstudio\bookease/
├── package.json              # ✅ Contains "dev" script
├── apps/
│   ├── api/                  # Backend API
│   └── web/                  # Frontend Web App
├── packages/
│   ├── logger/
│   └── types/
└── ...
```

---

## 🎯 **WHY THIS WORKS**

### **Root Package Scripts:**
```json
{
  "scripts": {
    "dev": "turbo run dev",    // ✅ This runs ALL apps
    "build": "turbo run build",
    "lint": "turbo run lint"
  }
}
```

### **Individual App Scripts:**
- **API**: `apps/api/package.json` → `dev` script
- **Web**: `apps/web/package.json` → No `dev` script (uses root)

---

## 🚀 **WHAT HAPPENS WHEN YOU RUN `pnpm run dev`**

1. **Turbo** starts both apps:
   - 📱 **Web App**: Runs on `http://localhost:5173`
   - 🔧 **API Server**: Runs on `http://localhost:3000`

2. **Hot Reload**: Both apps watch for changes
3. **Auto-compilation**: TypeScript compiles automatically

---

## 🛠️ **ALTERNATIVE COMMANDS**

### **Run Only Web App:**
```bash
# From root
pnpm --filter @bookease/web run dev
```

### **Run Only API:**
```bash
# From root
pnpm --filter @bookease/api run dev
```

### **Run with Specific Ports:**
```bash
# From root (if default ports conflict)
PORT=3001 pnpm run dev
```

---

## 📱 **ACCESS YOUR APPLICATIONS**

Once running:

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **API Health**: http://localhost:3000/health

---

## 🔧 **TROUBLESHOOTING**

### **If you get "Missing script: dev":**
```bash
# ✅ CORRECT (from root)
cd D:\realworkstudio\bookease
pnpm run dev

# ❌ WRONG (from apps/web)
cd D:\realworkstudio\bookease\apps\web
pnpm run dev
```

### **If ports are busy:**
```bash
# Kill processes on ports 3000 and 5173
netstat -ano | findstr :3000
netstat -ano | findstr :5173
```

### **If dependencies are missing:**
```bash
# From root
pnpm install
```

---

## 🎯 **QUICK START**

```bash
# 1. Go to project root
cd D:\realworkstudio\bookease

# 2. Install dependencies (if needed)
pnpm install

# 3. Run development server
pnpm run dev

# 4. Open browser to http://localhost:5173
```

---

**🎉 Your BookEase application will be running on both ports!**
