# Stage 1: Install all dependencies (including dev)
FROM node:22.15.0-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

# Try `npm ci` first; fallback to `npm install` if it fails 
RUN npm ci || npm install


# Stage 2: Build Next.js app
FROM node:22.15.0-alpine AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js application
RUN npm run build


# Stage 3: Production runtime
FROM node:22.15.0-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# (Optional) Alpine native dependencies
RUN apk add --no-cache libc6-compat

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy standalone build output and related assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Expose port and start the server
EXPOSE 3000
CMD ["node", "server.js"]
