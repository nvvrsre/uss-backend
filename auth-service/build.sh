docker build -t nvvrsre/usindus-auth-service .
docker push nvvrsre/usindus-auth-service
kubectl rollout restart deployment/auth-service
