# Use Node.js LTS image
FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

EXPOSE 3007
CMD ["node", "server.js"]
