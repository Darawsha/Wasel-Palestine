FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY nest-cli.json tsconfig*.json ./
COPY Backend ./Backend
COPY Frontend ./Frontend
RUN npm run build
RUN npm prune --omit=dev
FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/Frontend ./Frontend
EXPOSE 3000
USER node
CMD ["npm", "run", "start:prod"]

