FROM node AS build
WORKDIR /myapp
#below gets rebuilt when dependencies are changed
COPY package*.json ./         
RUN npm ci
#Below gets rebuilt when src gets changed
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /myapp/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]