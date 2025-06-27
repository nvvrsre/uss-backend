docker build -t nvvrsre/usindus-cart-service .
docker push nvvrsre/usindus-cart-service
kubectl rollout restart deployment/cart-service
