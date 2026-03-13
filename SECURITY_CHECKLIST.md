# Security Priority Actions

**Date:** March 13, 2026  
**Priority:** 🔴 CRITICAL

---

## ⚠️ Issues Found

### 1. **.env File Exposed in Repository** 🔴 CRITICAL

**Status:** EXPOSED DATABASE CREDENTIALS & API KEYS

**What's visible:**
- ✗ MongoDB connection string (user: `thang`, db: `taphoakeyt`)
- ✗ JWT_SECRET (crypto key)
- ✗ Google OAuth credentials (CLIENT_ID, CLIENT_SECRET)
- ✗ PayOS payment gateway keys
- ✗ Cloudinary upload credentials
- ✗ Email account password (Gmail app password)

**Risk Level:** 🔴 **CRITICAL** - All external services can be compromised

**Immediate Actions:**

```bash
# 1. Add .env to .gitignore immediately
cd keyt-shop-backend
echo ".env" >> .gitignore
echo ".env.*.local" >> .gitignore
echo ".env.production" >> .gitignore

# 2. Remove .env from git history
git rm --cached .env
git commit -m "🔐 Remove .env from git tracking"

# 3. Regenerate ALL credentials
# - MongoDB Atlas: Change user password & reset IP whitelist
# - Google Cloud: Regenerate OAuth credentials
# - PayOS: Issue new API keys
# - Cloudinary: Issue new tokens
# - Gmail: Create new app-specific password
```

**Updated .env.example (for repo only):**

```env
# ============ DATABASE ============
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>

# ============ SECURITY ============
JWT_SECRET=your-secret-key-here-min-64-chars

# ============ SERVER ============
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ============ OAUTH ============
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# ============ EMAIL (SMTP) ============
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# ============ PAYMENT (PayOS) ============
PAYOS_CLIENT_ID=your-client-id
PAYOS_API_KEY=your-api-key
PAYOS_CHECKSUM_KEY=your-checksum-key
PAYOS_RETURN_URL=http://localhost:5173/payment-success
PAYOS_CANCEL_URL=http://localhost:5173/orders

# ============ IMAGE UPLOAD (Cloudinary) ============
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

### 2. **.gitignore Not Properly Configured** 🟠 HIGH

**Current Status:**
```bash
# keyt-shop-backend/.gitignore
node_modules/
.DS_Store
```

**Missing entries:**
```bash
# Environment
.env
.env.local
.env.*.local
.env.production
.env.development

# Dependencies
node_modules/
package-lock.json (optional)
yarn.lock (optional)

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*

# Build
dist/
build/
www/

# Testing
coverage/
.nyc_output/

# Database dumps
*.sql
*.dump
```

**Action:**

```bash
# Update .gitignore
cat >> keyt-shop-backend/.gitignore << 'EOF'

# Environment variables
.env
.env.local
.env.*.local
.env.production
.env.development

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*
yarn-debug.log*

# Build
dist/
build/

# Testing
coverage/
.nyc_output/
EOF
```

---

### 3. **No .env.local in Frontend** 🟡 MEDIUM

**Status:** MISSING - Uses hardcoded fallback

**Current Behavior:**
```typescript
// src/utils/api.ts
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
```

**Fixed:** ✅ Created `.env.local` file with proper API URL

---

### 4. **No Production Environment Configuration** 🟡 MEDIUM

**Status:** MISSING

**Need to create:**

**Backend `.env.production`:**
```env
MONGODB_URL=mongodb+srv://prod-user:prod-password@prod-cluster.mongodb.net/keyt-shop-prod
JWT_SECRET=<generate-strong-secret-64-chars>
NODE_ENV=production
FRONTEND_URL=https://taphoakeyt.com
PORT=5000

# Production OAuth
GOOGLE_CLIENT_ID=prod-client-id
GOOGLE_CLIENT_SECRET=prod-client-secret

# Production Email
MAIL_USERNAME=noreply@taphoakeyt.com
MAIL_PASSWORD=prod-app-password

# Production Payment
PAYOS_CLIENT_ID=prod-payos-id
PAYOS_API_KEY=prod-api-key
PAYOS_CHECKSUM_KEY=prod-checksum
PAYOS_RETURN_URL=https://taphoakeyt.com/payment-success
PAYOS_CANCEL_URL=https://taphoakeyt.com/orders

# Production Upload
CLOUDINARY_CLOUD_NAME=prod-cloud-name
CLOUDINARY_API_KEY=prod-api-key
CLOUDINARY_API_SECRET=prod-api-secret
```

**Frontend `.env.production`:**
```env
VITE_API_URL=https://api.taphoakeyt.com/api
VITE_DEBUG=false
```

---

## 📋 Checklist: Secure Setup

### **Immediate (Today)**
- [ ] Add `.env` to `.gitignore`
- [ ] Remove `.env` from git history: `git rm --cached .env`
- [ ] Commit changes: `git commit -m "🔐 Remove .env"`
- [ ] **Regenerate ALL credentials:**
  - [ ] MongoDB password
  - [ ] JWT_SECRET
  - [ ] Google OAuth tokens
  - [ ] PayOS keys
  - [ ] Cloudinary keys
  - [ ] Gmail password

### **This Week**
- [ ] Create `.env.production`
- [ ] Setup CI/CD secrets in GitHub
- [ ] Update deployment scripts
- [ ] Enable environment-based configuration

### **Ongoing**
- [ ] Rotate credentials monthly
- [ ] Audit git history for secrets
- [ ] Use GitHub secret scanning
- [ ] Implement secrets management (AWS Secrets Manager, etc.)

---

## 🔗 Resources

- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub: Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Node.js Security Best Practices](https://nodejs.org/en/knowledge/file-system/security/introduction/)

---

**Status:** 🔴 **ACTION REQUIRED**  
**Created:** March 13, 2026  
**Priority:** Implement today to prevent credential compromise
