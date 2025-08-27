docker build -t nvvrsre/order-service .
docker push nvvrsre/order-service
kubectl rollout restart deployment/order-service
