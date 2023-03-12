FROM node:18-alpine
RUN apk add dumb-init
USER node
COPY --chown=node:node dist/packages/api /usr/psnextv2/api
COPY --chown=node:node node_modules /usr/psnextv2/api/node_modules
WORKDIR /usr/psnextv2/api

ENV NODE_ENV production
ENV PORT=8080
EXPOSE 8080
CMD ["dumb-init", "node", "main.js" ]
