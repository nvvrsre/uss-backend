# Cart Service

Microservice for user shopping carts in UshaSree Industries.

## Endpoints

- **GET /cart/:userId** — Get cart for a user
- **POST /cart/add** — Add product to cart
- **POST /cart/remove** — Remove product from cart
- **POST /cart/clear** — Clear user cart

## Environment Variables

See `.env.example` for required values.

## Docker

```sh
docker build -t <your-dockerhub>/ushasree-cart:latest .
docker run -p 3003:3003 --env-file .env <your-dockerhub>/ushasree-cart:latest
