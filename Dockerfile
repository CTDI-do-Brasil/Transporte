# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY server/package*.json ./server/
RUN cd server && npm install --production

COPY server/ ./server/

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
