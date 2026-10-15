FROM node:22-alpine AS build
WORKDIR /app
COPY client/package.json ./client/
RUN npm install --prefix client
COPY client ./client
RUN npm run build --prefix client

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json ./server/
RUN npm install --prefix server --omit=dev
COPY server ./server
COPY --from=build /app/client/dist ./client/dist
EXPOSE 4000
CMD ["node", "server/src/index.js"]
