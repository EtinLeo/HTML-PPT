FROM node:22-alpine
WORKDIR /app
COPY index.html server.js ./
COPY js ./js
COPY samples ./samples
COPY vendor ./vendor
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node", "server.js"]
