docker build -t nvvrsre/usindus-catalog-service.
docker push nvvrsre/usindus-catalog-service
kubectl rollout restart deployment/catalog-service
