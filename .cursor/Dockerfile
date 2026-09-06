FROM node:24-bookworm-slim

# Git is needed for source checkout; ca-certificates for HTTPS fetches the
# inspector performs against live sites.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

USER node
