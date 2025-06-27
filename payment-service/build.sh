docker build -t nvvrsre/usindus-payment-service .
docker push nvvrsre/usindus-payment-service
kubectl rollout restart deployment/payment-service
