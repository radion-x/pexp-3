#!/bin/bash

# Build Frontend and Prepare for Deployment
# This script builds the React frontend locally and copies it to server/public/dist

set -e  # Exit on any error

echo "🏗️  Building Pain Map Frontend for Deployment..."
echo ""

# Navigate to client directory
cd "$(dirname "$0")/client"

echo "📦 Installing dependencies..."
npm install

echo ""
echo "⚡ Building production frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Frontend build successful!"
    echo ""
    
    # Navigate back to root
    cd ..
    
    echo "📁 Copying built files to server/public/dist..."
    
    # Remove old dist if exists
    rm -rf server/public/dist
    
    # Copy new dist
    cp -r client/dist server/public/dist
    
    echo ""
    echo "✅ Files copied successfully!"
    echo ""
    echo "📊 Build summary:"
    echo "   Frontend build: client/dist/"
    echo "   Deployed to: server/public/dist/"
    echo ""
    
    # Show file sizes
    echo "📦 Built files:"
    ls -lh server/public/dist/
    echo ""
    
    echo "🎯 Next steps:"
    echo "   1. Review the built files above"
    echo "   2. Test locally if needed: cd server && npm start"
    echo "   3. Commit changes: git add server/public/dist"
    echo "   4. Push to GitHub: git commit -m 'Update frontend' && git push"
    echo "   5. Deploy in Coolify: Click 'Deploy' button"
    echo ""
    echo "✨ Ready to deploy!"
    
else
    echo ""
    echo "❌ Frontend build failed!"
    echo "   Check the errors above and fix them before deploying."
    exit 1
fi
