docker build -t nvvrsre/usindus-promo-service .
docker push nvvrsre/usindus-promo-service
kubectl rollout restart deployment/promo-service
