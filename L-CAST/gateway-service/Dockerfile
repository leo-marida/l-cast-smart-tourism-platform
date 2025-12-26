FROM node:18-alpine
WORKDIR /app

# 1. Create a default package.json
RUN npm init -y

# 2. Install the required libraries (This creates the dependencies automatically)
RUN npm install express pg redis neo4j-driver axios cors dotenv bcryptjs jsonwebtoken helmet morgan body-parser

# 3. Copy your code files (app.js, etc.)
COPY . .

EXPOSE 3000
CMD ["node", "app.js"]