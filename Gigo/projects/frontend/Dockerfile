FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy all files
COPY . .

# Pass build-time variables
ARG VITE_RIDE_APP_ID
ARG VITE_BACKEND_URL
ENV VITE_RIDE_APP_ID=$VITE_RIDE_APP_ID
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Build for production
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the build output from the builder stage
# Vite outputs to /dist by default
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for SPA routing if needed
# We use default config but add a fallback for React Router if needed
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
