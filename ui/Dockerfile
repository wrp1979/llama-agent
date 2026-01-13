# ============================================================================
# Development stage - Vite dev server with hot reload
# ============================================================================
FROM node:22-alpine AS dev

WORKDIR /app

# Install build tools for native dependencies (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Install dependencies first (cached layer)
COPY package.json ./
RUN npm install

# Copy source files
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]

# ============================================================================
# Build stage - Generate static files
# ============================================================================
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ============================================================================
# Production stage - Serve with nginx
# ============================================================================
FROM nginx:alpine AS prod

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
