# Coolify Deployment - Single Repo, Pre-Built Frontend

## 🎯 Your Deployment Strategy

**What you're doing:**
1. Build React frontend **locally** on your machine
2. Deploy backend to Coolify (from GitHub)
3. Backend serves the pre-built frontend files
4. Everything in one Git repo
5. One Coolify service (simpler!)

**Why this is smart:**
- ✅ Faster deployments (no frontend build on server)
- ✅ One service to manage
- ✅ Build frontend on your fast local machine
- ✅ Simpler Coolify setup
- ✅ All code in one repo

---

## 📋 Prerequisites

- Coolify instance running
- This repo on GitHub: `radion-x/pain-map`
- MongoDB (will create in Coolify)
- Anthropic API key
- Mailgun account

---

## 🚀 Step-by-Step Walkthrough

### STEP 1: Create MongoDB Database in Coolify

**1.1 Log into your Coolify dashboard**

**1.2 Create new database:**
- Click **"+ New"** (top right)
- Select **"Database"**
- Choose **"MongoDB"**

**1.3 Configure MongoDB:**
- **Name:** `pain-map-db`
- **Version:** Latest (default is fine)
- Click **"Create"**

**1.4 Wait for deployment:**
- You'll see build logs
- Wait for "Deployment successful"
- Status should show green/running

**1.5 Get connection string:**
- Click on your `pain-map-db` database
- Go to **"Environment Variables"** or **"Connection"** tab
- Copy the connection string - looks like:
  ```
  mongodb://username:password@pain-map-db:27017
  ```
- **Save this!** You'll need it in Step 3

---

### STEP 2: Build Frontend Locally

**2.1 Open terminal on your Mac**

**2.2 Navigate to your project:**
```bash
cd "/Users/radions/ZONE IMAC/Working/Eval - Pain Map-2"
```

**2.3 Go to client folder:**
```bash
cd client
```

**2.4 Install dependencies (if not already):**
```bash
npm install
```

**2.5 Build the production frontend:**
```bash
npm run build
```

You should see output like:
```
vite v5.x.x building for production...
✓ xxx modules transformed.
dist/index.html                   x.xx kB
dist/assets/index-xxxxx.css      xx.xx kB
dist/assets/index-xxxxx.js      xxx.xx kB
✓ built in x.xxs
```

**2.6 Verify the build:**
```bash
ls -la dist/
```

You should see:
- `index.html`
- `assets/` folder with JS and CSS files
- Other static files

**2.7 Copy built files to server's public directory:**
```bash
cd ..
rm -rf server/public/dist
cp -r client/dist server/public/dist
```

**2.8 Verify files copied:**
```bash
ls -la server/public/dist/
```

You should see the same files.

**2.9 Commit and push to GitHub:**
```bash
git add server/public/dist
git commit -m "Add pre-built frontend"
git push
```

**Important:** We need to make sure Git tracks the `dist` folder. Let me check if it's ignored...

---

### STEP 3: Deploy Backend to Coolify

**3.1 In Coolify, create new application:**
- Click **"+ New"** (top right)
- Select **"Resource"**
- Choose **"Application"**

**3.2 Connect to GitHub:**
- Source: **"GitHub"**
- Repository: Find and select **`radion-x/pain-map`**
- Branch: **`redesign-ui`** (or `main` if you merged)

**3.3 Configure build settings:**
- **Build Pack:** Select **"Dockerfile"**
- **Dockerfile Location:** `/server/Dockerfile`
- **Base Directory:** Leave empty (or put `server` if needed)
- **Publish Directory:** Leave empty
- **Port:** `3000`

**3.4 Name your application:**
- **Name:** `pain-map` (or whatever you prefer)
- **Description:** Pain Assessment Application

**3.5 Click "Create"** (don't deploy yet)

---

### STEP 4: Configure Environment Variables

**4.1 Go to Environment Variables tab**

**4.2 Click "Add" or "+" to add variables**

**4.3 Add these variables one by one:**

```env
NODE_ENV=production
```
```env
SERVER_PORT=3000
```
```env
SERVER_BASE_URL=https://your-domain.com
```
*Note: We'll update this with real domain after deployment*

```env
MONGODB_URI=mongodb://username:password@pain-map-db:27017/pain-assessment
```
*Use the connection string from Step 1.5, add `/pain-assessment` at the end*

```env
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```
*Get this from https://console.anthropic.com*

```env
EMAIL_HOST=smtp.mailgun.org
```
```env
EMAIL_PORT=587
```
```env
EMAIL_SECURE=false
```
```env
EMAIL_USER=postmaster@your-mailgun-domain.com
```
*Your Mailgun SMTP username*

```env
EMAIL_PASS=your-mailgun-smtp-password
```
*Your Mailgun SMTP password*

```env
EMAIL_FROM=Pain Assessment <noreply@yourdomain.com>
```
```env
DOCTOR_EMAIL=doctor@example.com
```
*Email where doctor gets notifications*

```env
ADMIN_EMAIL=admin@example.com
```
*Email where admin gets notifications*

```env
DASHBOARD_PASSWORD=choose-a-secure-password
```
*This protects /doctor dashboard - choose something secure!*

```env
SESSION_SECRET=generate-random-string-here
```
*Generate with: `openssl rand -base64 32`*

**4.4 Click "Save" after adding all variables**

---

### STEP 5: Add Persistent Storage for Uploads

**5.1 Go to "Storages" tab**

**5.2 Click "Add Storage" or "+"**

**5.3 Configure storage:**
- **Name:** `pain-map-uploads`
- **Source Path:** `/var/lib/coolify/volumes/pain-map-uploads`
  *(or any path on your Coolify server)*
- **Destination Path:** `/app/public/uploads`
- **Is Directory:** Check this box ✓

**5.4 Click "Save"**

**Why this matters:** Without persistent storage, uploaded pain map images will disappear when you redeploy!

---

### STEP 6: Configure Domain

**6.1 Go to "Domains" tab**

**6.2 Add your domain:**
- Click "Add Domain" or "+"
- Enter your domain: `painmap.yourdomain.com`
  *(or whatever domain you want to use)*

**6.3 SSL Certificate:**
- Check **"Generate SSL Certificate"** ✓
- Coolify will auto-generate Let's Encrypt SSL

**6.4 Click "Save"**

**6.5 Update DNS:**
- Go to your domain registrar (Cloudflare, etc.)
- Add an A record pointing to your Coolify server IP
- Wait for DNS propagation (can take a few minutes)

**6.6 Update SERVER_BASE_URL:**
- Go back to "Environment Variables" tab
- Find `SERVER_BASE_URL`
- Update it to your real domain: `https://painmap.yourdomain.com`
- Save

---

### STEP 7: Deploy!

**7.1 Click "Deploy" button** (top right, big button)

**7.2 Watch the logs:**

You'll see:
1. Pulling code from GitHub
2. Building Docker image
3. Starting container
4. Health checks

**Look for these success messages:**
```
✅ Server listening on port 3000
✅ Connected to MongoDB
✅ Anthropic SDK initialized
✅ Nodemailer transporter is ready
✅ Serving frontend from public/dist
```

**7.3 Wait for "Deployment successful"**

Status should turn green.

---

### STEP 8: Test Your Application

**8.1 Visit your domain:**
```
https://painmap.yourdomain.com
```

**8.2 You should see:**
- Pain assessment homepage
- Ability to click on body diagram
- All UI elements loading

**8.3 Test the pain mapping:**
- Click on body regions
- Set pain intensity
- Fill in red flags
- Submit form

**8.4 Check email:**
- Look in your inbox (and spam folder)
- You should receive assessment notification

**8.5 Test doctor dashboard:**
```
https://painmap.yourdomain.com/doctor
```
- Log in with the `DASHBOARD_PASSWORD` you set
- You should see submitted assessment

---

## 🔄 Updating Your Application

### When You Make Changes:

**Frontend Changes (React/UI):**

1. **Build locally:**
   ```bash
   cd client
   npm run build
   ```

2. **Copy to server public:**
   ```bash
   cd ..
   rm -rf server/public/dist
   cp -r client/dist server/public/dist
   ```

3. **Commit and push:**
   ```bash
   git add server/public/dist
   git commit -m "Update frontend"
   git push
   ```

4. **Deploy in Coolify:**
   - Go to your application in Coolify
   - Click "Deploy" button
   - New frontend served immediately!

**Backend Changes (API/Server):**

1. **Make your changes** in `server/` files

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Update backend"
   git push
   ```

3. **Deploy in Coolify:**
   - Click "Deploy" button
   - Backend rebuilds and restarts

---

## 📝 Important Files to Understand

### server/app.js (already configured)

This serves your pre-built frontend:

```javascript
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dist', 'index.html'));
  });
}
```

### server/Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p public/uploads/assessment_files public/uploads/temp && \
    chown -R node:node public/uploads
USER node
EXPOSE 3000
CMD ["node", "app.js"]
```

This:
1. Copies your server code
2. Installs dependencies
3. **Includes the pre-built frontend** in `public/dist`
4. Starts the server

---

## 🔧 Git Configuration for dist Folder

By default, `dist` folders are usually gitignored. We need to make sure yours isn't.

**Check if dist is ignored:**
```bash
cat server/.gitignore
cat .gitignore
```

**If you see `dist` or `public/dist` in gitignore:**

1. **Remove it or add exception:**

In `.gitignore`:
```
# Ignore client dist but not server's pre-built version
client/dist
!server/public/dist
```

2. **Force add the dist folder:**
```bash
git add -f server/public/dist
```

---

## ✅ Verification Checklist

After deployment:

- [ ] Homepage loads at your domain
- [ ] Pain mapping canvas displays
- [ ] Can click on body and mark pain points
- [ ] Form validation works
- [ ] Can submit assessment
- [ ] AI summary generates after submit
- [ ] Email notification arrives
- [ ] Pain map images show in email
- [ ] Doctor dashboard accessible at `/doctor`
- [ ] Can log into dashboard
- [ ] Can view submitted assessment
- [ ] Pain map images display in dashboard
- [ ] Uploaded files persist after redeployment

---

## 🐛 Troubleshooting

### Issue: Coolify can't find Dockerfile

**Solution:**
- Make sure Dockerfile location is `/server/Dockerfile`
- Check that file exists in your repo

### Issue: Frontend shows 404 or blank page

**Check:**
1. Did you build frontend locally? (`npm run build`)
2. Did you copy `dist` to `server/public/dist`?
3. Did you commit and push `server/public/dist`?
4. Is `NODE_ENV=production` set in Coolify?
5. Check Coolify logs for "Serving frontend from public/dist"

### Issue: API calls fail

**Check:**
1. Backend is running (check Coolify status)
2. MongoDB is running
3. All environment variables are set
4. Check backend logs in Coolify

### Issue: Uploads don't persist after redeploy

**Check:**
1. Persistent storage is added in Coolify
2. Destination path is `/app/public/uploads`
3. Storage shows in "Storages" tab

### Issue: Email doesn't send

**Check:**
1. Mailgun credentials are correct
2. Sender domain is verified in Mailgun
3. Check backend logs for SMTP errors
4. Check spam folder

### Issue: MongoDB connection fails

**Check:**
1. MongoDB is running in Coolify
2. `MONGODB_URI` format is correct
3. Added `/pain-assessment` database name at end
4. Check MongoDB service is in same Coolify project

---

## 🔒 Security Notes

1. **Never commit `.env` files**
2. **Use strong `DASHBOARD_PASSWORD`**
3. **Generate random `SESSION_SECRET`:**
   ```bash
   openssl rand -base64 32
   ```
4. **Keep API keys secure**
5. **Use HTTPS only** (automatic with Coolify SSL)

---

## 📊 Monitoring

### In Coolify Dashboard:

**Application Overview:**
- CPU usage
- Memory usage
- Deployment history
- Real-time logs

**Logs Tab:**
- View live server logs
- Filter by time
- Search for errors

**Metrics:**
- Request counts
- Response times
- Error rates

---

## 🎯 Why This Approach Works Well

**Benefits of pre-building frontend:**

1. ✅ **Faster deployments** - No Vite build on server
2. ✅ **Fewer build failures** - Build on your local machine
3. ✅ **Control** - You see build output before deploying
4. ✅ **Simpler** - One service instead of two
5. ✅ **Resource efficient** - Server doesn't need to compile React

**When to rebuild frontend:**
- UI changes
- Style changes
- New features in React components
- Config changes in client/

**Backend-only deploys:**
- API changes
- Database schema updates
- Email template changes
- Environment variable updates

---

## 📞 Quick Reference

### Local Build Commands
```bash
cd client
npm run build
cd ..
rm -rf server/public/dist
cp -r client/dist server/public/dist
git add server/public/dist
git commit -m "Update frontend"
git push
```

### Coolify Deployment
1. Go to your app in Coolify
2. Click "Deploy" button
3. Watch logs for success

### Environment Variables Needed
- `NODE_ENV=production`
- `SERVER_PORT=3000`
- `MONGODB_URI=...`
- `ANTHROPIC_API_KEY=...`
- Email credentials (5 vars)
- `DASHBOARD_PASSWORD`
- `SESSION_SECRET`

### Important URLs
- Main app: `https://yourdomain.com`
- Doctor dashboard: `https://yourdomain.com/doctor`
- API endpoints: `https://yourdomain.com/api/*`

---

**You're ready to deploy!** Follow the steps in order and you'll have your app running in about 15-20 minutes.

Need help? Check the troubleshooting section or Coolify logs for errors.
