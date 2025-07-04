# 🚦 Kubernetes Ingress with HTTPS using Argo CD, NGINX, and cert-manager

---

## **1. Why Do We Need These Components?**

| Component                      | Why It’s Needed                                                                 | What If Skipped?                        |
| ------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------- |
| **Ingress Controller (nginx)** | Handles incoming HTTP(S) traffic, routes to services in your cluster            | No public traffic reaches your apps     |
| **cert-manager**               | Automates issuing/renewing SSL certificates (e.g., Let’s Encrypt)               | No HTTPS/SSL for your apps              |
| **ClusterIssuer**              | Tells cert-manager how to talk to Let’s Encrypt (email, ACME config)            | cert-manager can’t request certificates |
| **Ingress Resource**           | Tells controller which domains/paths go to which K8s services and enables HTTPS | No way to access apps via domain        |
| **DNS Record**                 | Points your real-world domain to your Kubernetes LoadBalancer                   | DNS/ACME validation will fail           |
| **Argo CD**                    | Manages the above infra as code, auto-heals, tracks changes                     | Manual setup, risk of drift, no GitOps  |

---

## **2. Prerequisites**

- Kubernetes Cluster (EKS, kops, kubeadm, kind, etc.)
- `kubectl` configured and connected
- (Optional) `Helm` installed if you want the Helm method
- AWS: Sufficient ELB quota/subnets if using EKS

---

## **3. Installation Steps: Clean, Repeatable, and Fully Explained**

### **Step 1: Install NGINX Ingress Controller**

#### **Purpose:**

- Exposes your Kubernetes services to the outside world and performs path/host-based routing.


kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.crds.yaml

kubectl apply -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml



#### **Option A: Official Manifest**

```sh
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
```

- Creates the `ingress-nginx` namespace and all resources for you.
- AWS/EKS: Creates a `LoadBalancer` Service (AWS ELB DNS).

#### **Option B: Helm**

```sh
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace --set controller.service.type=LoadBalancer
```

- More control via `values.yaml` if you want custom settings.

#### **Check installation:**

```sh
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

You must see a pod like `ingress-nginx-controller-xxxxx` and an external IP (ELB DNS).

---

### **Step 2: Install cert-manager**

#### **Purpose:**

- Manages all your SSL/TLS certificates automatically.

#### **Option A: Manifest**

```sh
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```

#### **Option B: Helm**

```sh
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set installCRDs=true
```

#### **Check:**

```sh
kubectl get pods -n cert-manager
```

Pods like `cert-manager-xxxx` should be Running.

---

### **Step 3: Create a ClusterIssuer**

#### **Purpose:**

- Tells cert-manager how to talk to Let’s Encrypt and prove DNS/HTTP control for certificates.

#### **Create ****\`\`****:**

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: <your-email>
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

#### **Apply:**

```sh
kubectl apply -f cluster-issuer.yaml
```

---

### **Step 4: Create Your Ingress Resource (With HTTPS)**

#### **Purpose:**

- Tells NGINX how to route external traffic to your backend/frontend services, and enables HTTPS via cert-manager.

#### **Example ****\`\`****:**

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
    nginx.ingress.kubernetes.io/configuration-snippet: |
      location ^~ /.well-known/acme-challenge/ {
        allow all;
        auth_basic off;
      }
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - www.ushasree.xyz
      secretName: ushasree-tls
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

#### **Apply:**

```sh
kubectl apply -f ushasree-ingress.yaml
```

- This enables both routing *and* automatic HTTPS. The annotation ensures ACME challenge works with HTTP and does not get redirected to HTTPS.

---

### **Step 5: Update Your DNS (Mandatory!)**

#### **Purpose:**

- Lets both users and Let’s Encrypt reach your ELB.

#### **How:**

- Find your ELB DNS:
  ```sh
  kubectl get svc -n ingress-nginx
  ```
- In your DNS provider, create a **CNAME** for `www.ushasree.xyz` -> `<your-elb>.elb.amazonaws.com`
- **Wait for DNS to propagate!** (Check with `nslookup` or [whatsmydns.net](https://www.whatsmydns.net/))

---

### **Step 6 (Optional): GitOps & Argo CD**

- Store all manifests (controller, cert-manager, issuer, ingress) in Git.
- Use Argo CD to sync and auto-heal your infra!
- For Argo CD Application examples, ask Mentor!

---

## **4. Final Working Order: Step-by-Step Checklist**

1. Install NGINX Ingress Controller
2. Install cert-manager
3. Wait for pods to be Running:
   ```sh
   kubectl get pods -n ingress-nginx
   kubectl get pods -n cert-manager
   ```
4. Apply ClusterIssuer
5. Apply Ingress
6. Point DNS to your ELB (wait for propagation)
7. Check cert status:
   ```sh
   kubectl get certificate -A
   kubectl get secret ushasree-tls -n default
   kubectl describe certificate ushasree-tls -n default
   ```
8. Test app: `https://www.ushasree.xyz` (🔒!)

---

## **5. Troubleshooting Table**

| Symptom                      | Usual Cause                              | Fix                                      |
| ---------------------------- | ---------------------------------------- | ---------------------------------------- |
| No EXTERNAL-IP               | LB provisioning/VPC/Cloud issue          | Wait, check cloud dashboard              |
| Cert stuck “False”           | DNS not set or ACME challenge not routed | Fix DNS, add ACME snippet, retry         |
| 404/502 Gateway              | Service missing, path misconfigured      | Check backend service/port and Ingress   |
| Cert “READY” but browser red | Old browser cache, DNS lag               | Hard refresh/Incognito, check cert dates |
| ACME challenge 308           | HTTP redirected to HTTPS                 | Add snippet to NOT redirect challenge    |

---

## **6. Must-Know Commands**

```sh
kubectl get pods -A
kubectl get svc -A
kubectl get ingress -A
kubectl get certificate -A
kubectl describe certificate <name> -n <namespace>
kubectl get secret <tls-secret-name> -n <namespace>
kubectl logs -n cert-manager -l app.kubernetes.io/name=cert-manager --tail=50
kubectl get events -A --sort-by=.lastTimestamp | grep -i ingress
nslookup <your-domain>
curl -I http://<your-domain>/.well-known/acme-challenge/test
```

---

## **7. Full Uninstall (Cleanup)**

- Remove Ingress, Issuer, and cert-manager if needed:

```sh
kubectl delete -f ushasree-ingress.yaml
kubectl delete -f cluster-issuer.yaml
kubectl delete -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml
```

- Or uninstall Helm charts as needed.

---

## **8. Mentor’s Checklist for HTTPS Ingress Success**

-

---

**Save this file and reuse for every new project.** If you want a PDF or example Argo CD Application YAMLs, just ask Mentor. 🚦

Happy Ingress + HTTPS + GitOps, Vishnu!

