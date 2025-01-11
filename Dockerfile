FROM node:20

WORKDIR /usr/src/app

COPY backend/package*.json ./

RUN npm install

COPY backend/ ./

EXPOSE 20169

CMD ["node", "app.js"]
