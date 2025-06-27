docker build -t nvvrsre/usindus-notification-service .
docker push nvvrsre/usindus-notification-service
kubectl rollout restart deployment/notification-service
