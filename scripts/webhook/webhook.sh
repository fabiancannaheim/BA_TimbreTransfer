#!/bin/bash

# Navigate to the Git repository and pull the latest changes
cd /home/ubuntu/BA_TimbreTransfer
git pull

# Navigate to the React application directory
cd /home/ubuntu/BA_TimbreTransfer/src/webapp/frontend/webapp

# Install dependencies and build the application
npm install
npm run build

# Copy the new build to the Apache server root
cp -R build/* /var/www/app/
