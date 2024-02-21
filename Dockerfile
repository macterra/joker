# Use the official Node.js LTS (Long Term Support) Alpine version as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json .

# Install dependencies
RUN npm ci

# Copy app
COPY server.js .

# Run...
CMD ["node", "server.js"]
