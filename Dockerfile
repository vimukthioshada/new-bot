# Use official Node.js image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy remaining app files
COPY . .

# Expose (Render ignores this but it's good practice)
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
