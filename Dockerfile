FROM node:18

# Install Google Chrome and dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
ENV PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy the rest of the application
COPY . .

# Command to run the bot
CMD ["node", "whatsapp-bot.js"]
