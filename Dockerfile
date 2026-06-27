# Production image for Strapi v5 (used by the staging stack).
# Single stage: Strapi needs source + node_modules + build artifacts at runtime.
# Schema/content-type migrations run automatically on boot.

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
# native deps for better-sqlite3 / sharp compilation during install
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 build-essential \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# The repo ships only the sqlite driver (local dev). Postgres needs `pg` at runtime.
# Long-term cleaner fix: add `pg` to the repo's dependencies. For now install it here.
RUN npm ci && npm install pg@8.13.0

COPY . .
RUN npm run build

EXPOSE 1337
CMD ["npm", "run", "start"]
