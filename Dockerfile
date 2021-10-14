FROM alpine:latest

RUN apk add --no-cache ffmpeg nodejs npm

WORKDIR /root
ADD app/ /root/

RUN npm install
RUN npm install -g typescript
RUN tsc index.ts
RUN npm remove -g typescript

ENTRYPOINT ["node", "index.js"]