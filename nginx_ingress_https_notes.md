# 🚦 Kubernetes Ingress Controller with HTTPS via ArgoCD & cert-manager

---

## 1. What Are You Setting Up?

You are automating secure HTTPS traffic routing in Kubernetes using:
- **NGINX Ingress Controller** (for routing)
- **cert-manager** (for automatic SSL certificates via Let’s Encrypt)
- **ArgoCD** (for GitOps: everything is managed via YAML in git)
- **ClusterIssuer** (Let’s Encrypt integration for the whole cluster)
- **Ingress** (routes traffic to your services and configures HTTPS)

---

## 2. Why This Setup?

- **Centralized routing:** All user traffic enters your cluster via a single public IP and is routed to backend, frontend, etc. via rules.
- **Automatic HTTPS:** Certificates renew themselves with Let’s Encrypt. No more manual cert management.
- **Self-healing:** ArgoCD will always restore the desired state from git.
- **Fully GitOps:** All changes (infra, config, HTTPS) go through code!

---

## 3. Step-by-Step: What Did You Apply?

### A. Install NGINX Ingress Controller (via ArgoCD Application YAML)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ingress-nginx
  namespace: default        # ArgoCD's namespace (default in your case)
spec:
  project: default
  source:
    repoURL: https://kubernetes.github.io/ingress-nginx
    chart: ingress-nginx
    targetRevision: 4.10.0
    helm:
      parameters:
        - name: controller.service.type
          value: LoadBalancer
  destination:
    server: https://kubernetes.default.svc
    namespace: ingress-nginx     # NGINX will be installed here
  syncPolicy:
    automated: {}
```
- **Explanation:**  
  - This Application will let ArgoCD install and maintain NGINX ingress using the official Helm chart.
  - It will create a LoadBalancer service (public IP).

---

### B. Install cert-manager (via ArgoCD Application YAML)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  namespace: default        # ArgoCD's namespace
spec:
  project: default
  source:
    repoURL: https://charts.jetstack.io
    chart: cert-manager
    targetRevision: v1.14.5
    helm:
      parameters:
        - name: installCRDs
          value: "true"
  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager    # cert-manager will be installed here
  syncPolicy:
    automated: {}
```
- **Explanation:**  
  - Installs cert-manager via Helm.
  - `installCRDs: true` ensures all CRDs needed for cert-manager are created.

---

### C. Create Let’s Encrypt ClusterIssuer

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: nushasree25@gmail.com   # Your email for expiry notifications
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```
- **Explanation:**  
  - Defines a global issuer for Let’s Encrypt certs using HTTP-01 challenge via the NGINX ingress class.
  - This will be referenced by your ingress for auto-HTTPS.

---

### D. Define the Main Ingress Resource (HTTPS, Path Routing)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ushasree-ingress
  namespace: default
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - www.ushasree.xyz
      secretName: ushasree-tls   # Cert-manager will auto-manage this secret
  rules:
    - host: www.ushasree.xyz
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 80
          - path: /products
            pathType: Prefix
            backend:
              service:
                name: product-service
                port:
                  number: 3002
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
```
- **Explanation:**
  - Routes `/api` to your backend, `/products` to product service, `/` to frontend.
  - TLS section: tells ingress to use the `ushasree-tls` secret (managed by cert-manager) for HTTPS.

---

## 4. How Does This All Work Together?

1. **ArgoCD** applies and manages the Helm charts for NGINX and cert-manager (and keeps them up-to-date).
2. **cert-manager** listens for Ingresses with the `cert-manager.io/cluster-issuer` annotation and requests an SSL certificate from Let’s Encrypt.
3. **Let’s Encrypt** verifies DNS and HTTP routing via the public IP (LoadBalancer) provided by NGINX.
4. **cert-manager** stores the resulting cert in a Kubernetes secret (`ushasree-tls`), and your Ingress instantly switches to HTTPS—no manual steps!
5. **Clients** access your services securely at `https://www.ushasree.xyz/`.

---

## 5. Troubleshooting

- **Certificate stuck in "Issuing":**
  - Wait 5+ minutes.
  - Check with:  
    ```
    kubectl describe certificate ushasree-tls -n default
    kubectl get events --sort-by=.lastTimestamp -n default | grep ushasree-tls
    ```
  - Cert-manager logs (for errors about DNS, challenge, etc.):  
    ```
    kubectl logs -n cert-manager -l app.kubernetes.io/name=cert-manager --tail=50
    ```
- **ACME Challenge fails:**  
  - Make sure your DNS points to the NGINX LoadBalancer (test with `nslookup www.ushasree.xyz`).
  - Curl the HTTP challenge endpoint (should not 404):
    ```
    curl -I http://www.ushasree.xyz/.well-known/acme-challenge/test
    ```
- **Browsers say "Not Secure":**
  - Wait for cert to be issued.
  - Reload after a few minutes.

---

## 6. Alternative Install Methods

- **Helm**:
  ```
  helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
  helm install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace
  ```
- **kubectl apply** (direct manifest):  
  ```
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
  ```
- **Kustomize**: Combine multiple manifests in one overlay.

---

## 7. Summary Table

| Step         | Tool/Resource         | Namespace        | Purpose                      |
|--------------|----------------------|------------------|------------------------------|
| Install NGINX| ArgoCD Application   | ingress-nginx    | Ingress controller           |
| cert-manager | ArgoCD Application   | cert-manager     | ACME certificate manager     |
| ClusterIssuer| cert-manager.io/v1   | cluster-scoped   | LetsEncrypt certs for Ingress|
| Ingress      | networking.k8s.io/v1 | default          | HTTPS routing for all apps   |

---

## 8. Quick Command Reference

```bash
kubectl get ingress -A
kubectl get certificate -A
kubectl describe certificate ushasree-tls -n default
kubectl get secret ushasree-tls -n default
kubectl get events --sort-by=.lastTimestamp -n default | grep ushasree-tls
kubectl logs -n cert-manager -l app.kubernetes.io/name=cert-manager --tail=50
nslookup www.ushasree.xyz
curl -v https://www.ushasree.xyz
```

---

## 9. Downloadable Version?

You can use this file as Markdown for docs or README. For PDF, use a Markdown editor with PDF export (Typora, VS Code, etc.) or request Mentor for a PDF version!

---

*Prepared by Mentor (ChatGPT) — 2025-07-02*

