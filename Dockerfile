FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && \
    # Remove unnecessary files from standalone to reduce image size
    rm -rf .next/standalone/node_modules/.package-lock.json && \
    find .next/standalone/node_modules -name '*.md' -o -name 'LICENSE*' -o -name '*.ts' -o -name '*.map' | xargs rm -f && \
    find .next/standalone/node_modules -name '.npmignore' -o -name '.eslintrc*' -o -name 'tsconfig*' | xargs rm -f && \
    find .next/standalone/node_modules -type d -name 'test' -o -name 'tests' -o -name '__tests__' -o -name 'docs' | xargs rm -rf

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE ${PORT:-3000}
CMD ["node", "server.js"]
