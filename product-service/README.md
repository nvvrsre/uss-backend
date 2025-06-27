# Product Service

Microservice for product catalog in UshaSree Industries.

## Endpoints

- **GET /products** — List all products
- **GET /products/:id** — Get product details by ID
- **POST /products** — Add product (admin/demo)

## Environment Variables

See `.env.example` for required values.

## Docker

```sh
docker build -t <your-dockerhub>/ushasree-product:latest .
docker run -p 3002:3002 --env-file .env <your-dockerhub>/ushasree-product:latest
