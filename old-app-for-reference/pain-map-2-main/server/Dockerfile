# Multi-stage build: Frontend + Backend
# FORCE REBUILD: 2025-10-22T01:15:00Z

FROM node:20-alpine AS frontend-builder

# Build React frontend
WORKDIR /frontend
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Backend stage
FROM node:20-alpine

WORKDIR /app

# Install netcat for diagnostics, then run test
RUN apk add --no-cache netcat-openbsd
RUN echo "--- Running Mailgun SMTP Connection Test ---" && \
    nc -z -w 5 smtp.mailgun.org 587 && \
    echo "SUCCESS: Connection to smtp.mailgun.org:587 was successful." || \
    echo "FAILURE: Connection to smtp.mailgun.org:587 FAILED. Check provider firewall rules." && \
    echo "------------------------------------------"

# Copy backend package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend application code
COPY server/ ./

# Copy built frontend from builder stage into public/dist
COPY --from=frontend-builder /frontend/dist ./public/dist

# Create upload directories with proper permissions
RUN mkdir -p public/uploads/assessment_files public/uploads/temp && \
    chown -R node:node public/uploads

# Switch to non-root user
USER node

# Expose API port
EXPOSE 3000

# Start the server
CMD ["node", "app.js"]