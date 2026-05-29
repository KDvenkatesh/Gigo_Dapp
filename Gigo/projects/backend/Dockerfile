FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose backend port
EXPOSE 3001

# Start the Node server
CMD ["npm", "start"]
