FROM node:18-alpine
RUN apk add dumb-init
USER node
COPY ./ /usr/psnext
WORKDIR /usr/psnext
RUN npm i --leagcy-peer-deps
RUN nx build api
# COPY --chown=node:node dist/packages/api /usr/apps/mserver
# COPY --chown=node:node node_modules /usr/apps/mserver/node_modules
WORKDIR /usr/psnext/dist/api

ENV NODE_ENV production
ENV PORT=8080
CMD ["dumb-init", "node", "main.js" ]
