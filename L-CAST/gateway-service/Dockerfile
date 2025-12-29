FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# CHANGED: We now use server.js as the entry point
CMD ["node", "server.js"]