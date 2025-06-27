docker build -t nvvrsre/usindus-order-service .
docker push nvvrsre/usindus-order-service
kubectl rollout restart deployment/order-service
