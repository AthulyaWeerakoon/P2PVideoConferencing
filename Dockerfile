FROM node:20

WORKDIR /usr/src/app

COPY Backend/package*.json ./

RUN npm install

COPY Backend/ ./

EXPOSE 2087

CMD ["node", "app.js"]
