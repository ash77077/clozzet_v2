#!/bin/bash
set -e

echo "Starting Frontend Deployment..."

# Navigate to frontend directory
cd ~/apps/frontend

# Pull latest changes
echo "Pulling latest changes..."
git pull origin master

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building Angular application..."
npm run build -- --configuration=production

# Copy build to web server directory
echo "Copying files to web directory..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

echo "Frontend deployment completed successfully!"
