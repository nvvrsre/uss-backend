docker build -t nvvrsre/usindus-product-service .
docker push nvvrsre/usindus-product-service
kubectl rollout restart deployment/product-service
