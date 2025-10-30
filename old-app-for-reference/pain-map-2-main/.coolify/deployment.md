# Coolify Deployment Guide

## Prerequisites
- Coolify instance running
- GitHub repository connected to Coolify
- MongoDB database (can be created in Coolify)

## Step-by-Step Deployment

### 1. Create a New Project in Coolify
1. Log into your Coolify dashboard
2. Click "New" → "Resource" → "Application"
3. Select your GitHub repository: `radion-x/pain-map`
4. Choose branch: `redesign-ui` (or `main`)

### 2. Configure Build Settings
- **Build Pack**: Dockerfile
- **Dockerfile Location**: `/Dockerfile` (root of repo)
- **Port**: `3000`
- **Health Check Path**: `/` (optional)

### 3. Set Environment Variables
Go to the "Environment Variables" section and add:

```bash
# Server Configuration
NODE_ENV=production
SERVER_PORT=3000
SERVER_BASE_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb://your-mongodb-url/pain-assessment

# Claude AI API
ANTHROPIC_API_KEY=your-claude-api-key

# Email Configuration (Mailgun)
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-mailgun-smtp-username
EMAIL_PASS=your-mailgun-smtp-password
EMAIL_FROM=Pain Assessment Tool <noreply@your-domain.com>
DOCTOR_EMAIL=doctor@example.com
ADMIN_EMAIL=admin@example.com

# Dashboard Access
DASHBOARD_PASSWORD=your-secure-password

# Session Secret
SESSION_SECRET=your-random-secret-key-here
```

### 4. Create MongoDB Database (if needed)
1. In Coolify, click "New" → "Database" → "MongoDB"
2. Deploy the database
3. Copy the connection string
4. Update `MONGODB_URI` in your application's environment variables

### 5. Configure Persistent Storage
Add a volume for file uploads:
1. Go to "Storages" tab in your application
2. Add new storage:
   - **Source Path**: `/app/public/uploads`
   - **Mount Path**: `/app/public/uploads`
   - This ensures uploaded files persist across deployments

### 6. Deploy
1. Click "Deploy" or enable "Automatic Deployment" for auto-deploy on git push
2. Monitor logs during deployment
3. Once deployed, access your app at the provided URL

### 7. Configure Domain (Optional)
1. Go to "Domains" tab
2. Add your custom domain
3. Enable SSL (automatic with Coolify)

## Updating the Backend to Serve Frontend

Make sure your `server/app.js` serves the built frontend files:

```javascript
// Add this AFTER all API routes but BEFORE error handlers
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, 'public/dist')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dist', 'index.html'));
  });
}
```

## Troubleshooting

### Build Fails
- Check Coolify build logs
- Ensure all dependencies are in package.json
- Verify Dockerfile syntax

### Database Connection Issues
- Verify MONGODB_URI format
- Check network connectivity between services
- Ensure MongoDB is running

### File Upload Issues
- Verify persistent storage is mounted
- Check directory permissions
- Ensure upload directory exists

### Email Not Sending
- Verify Mailgun credentials
- Check email configuration
- Review server logs for SMTP errors

## Environment-Specific Notes

### Development vs Production
- Development uses Vite dev server on port 5173
- Production uses single Node.js server on port 3000
- Frontend API proxy is only needed in development

### Scaling Considerations
- File uploads stored in persistent volume
- Consider S3/external storage for high volume
- MongoDB can be scaled separately in Coolify
