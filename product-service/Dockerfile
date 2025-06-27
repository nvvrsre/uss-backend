# Use Node.js 18 LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first for Docker cache
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --production

# Copy the rest of the code
COPY . .

# Expose the port (default: 3002)
EXPOSE 3002

# Start the service
CMD [ "npm", "start" ]
