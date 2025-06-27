docker build --no-cache -t nvvrsre/usindus-api-gateway .
docker push nvvrsre/usindus-api-gateway
kubectl rollout restart deployment/api-gateway
