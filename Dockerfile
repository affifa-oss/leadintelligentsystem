# LeadIntel — one container: builds the frontend, then the API serves it on port 4000.
FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix backend && npm ci --prefix frontend
COPY backend ./backend
COPY frontend ./frontend
RUN npm run build --prefix frontend
ENV NODE_ENV=production PORT=4000 DB_PATH=/data/leadintel.db
VOLUME ["/data"]
EXPOSE 4000
CMD ["npm", "start", "--prefix", "backend"]
