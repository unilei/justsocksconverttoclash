FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm run build:server

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/package*.json ./

RUN npm ci --only=production

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist-server/index.js"]
