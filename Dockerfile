# Use lightweight Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy project files
COPY . .

# Expose backend port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]