# syntax = docker/dockerfile:1

ARG NODE_VERSION=20.10.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV="production"

# Build stage
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

COPY package*.json ./
RUN npm ci --include=dev

COPY . .

# Run tests - deploy fails if tests fail
RUN npm run test

# Build only if tests pass
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# Final stage
FROM base

COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/

EXPOSE 3000

CMD [ "npm", "run", "start" ]
