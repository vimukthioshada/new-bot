# Use a stable node version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and lock files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all remaining files
COPY . .

# Start the bot
CMD ["npm", "start"]
