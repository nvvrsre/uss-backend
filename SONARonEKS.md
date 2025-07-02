
# SonarQube on EKS: Ultimate Foolproof Installation Guide (with OIDC & IRSA)

---

## 0. Prerequisites

- EKS cluster accessible (kubectl and eksctl configured)
- AWS CLI set up for correct AWS account
- Helm installed

---

## 1. Ensure Default StorageClass (EBS)

```sh
kubectl get storageclass
```
If you don’t see `(default)` for `gp2` or `gp3`:
```sh
kubectl patch storageclass gp2 -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

---

## 2. Enable OIDC Provider (Terminal)

```sh
eksctl utils associate-iam-oidc-provider --region=<region> --cluster=<cluster-name> --approve
# Example:
eksctl utils associate-iam-oidc-provider --region=ap-south-1 --cluster=nvvr-eks --approve
```
**Purpose:** Enables identity federation so K8s pods can securely access AWS services.

---

## 3. Install EBS CSI Driver (EKS Add-on)

```sh
eksctl create addon --name aws-ebs-csi-driver --cluster <cluster-name> --region <region>
# Example:
eksctl create addon --name aws-ebs-csi-driver --cluster nvvr-eks --region ap-south-1
```
**Purpose:** Manages dynamic EBS volume provisioning for K8s PVCs.

---

## 4. IRSA: Create IAM Role & K8s Service Account

```sh
eksctl create iamserviceaccount   --name ebs-csi-controller-sa   --namespace kube-system   --cluster <cluster-name>   --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy   --approve   --override-existing-serviceaccounts
# Example:
eksctl create iamserviceaccount   --name ebs-csi-controller-sa   --namespace kube-system   --cluster nvvr-eks   --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy   --approve   --override-existing-serviceaccounts
```
**Purpose:** Securely grants EBS permissions to only the CSI driver pod.

---

## 5. Assign IAM Role to EBS CSI Add-on (AWS Console)

- Go to **EKS Console > Clusters > [your cluster] > Add-ons > aws-ebs-csi-driver**
- Click **Edit/Add IAM Role**
- Select IAM role created in step 4
- Save changes

---

## 6. Validate IRSA/CSI Setup (Terminal)

Check driver pods:

```sh
kubectl get pods -n kube-system | grep ebs-csi
```
All pods must be Running.
Check service account annotation:

```sh
kubectl get serviceaccount ebs-csi-controller-sa -n kube-system -o yaml
```
Must include:
```yaml
annotations:
  eks.amazonaws.com/role-arn: arn:aws:iam::<account>:role/<role-name>
```

---

## 7. (Optional Dev Only) Add EBS Policy to NodeGroup IAM Role

- IAM Console > Roles > [NodeGroup Role] > Attach policies > AmazonEBSCSIDriverPolicy

---

## 8. Prepare SonarQube Helm Values

Create `values.yaml`:

```yaml
monitoringPasscode: "Sonarqube123"
community:
  enabled: true
```

---

## 9. Deploy SonarQube with Helm

```sh
helm repo add sonarqube https://SonarSource.github.io/helm-chart-sonarqube
helm repo update
#kubectl create namespace sonarqube
helm install sonarqube sonarqube/sonarqube -n default -f values.yaml
```

---

## 10. Validate PVC and Pod Status

```sh
kubectl get pvc 
kubectl get pods
```
- PVCs should be Bound
- Pods should be Running

---

## 11. Access SonarQube UI

```sh
kubectl port-forward svc/sonarqube-sonarqube 9000:9000
```
kubectl patch svc sonarqube-sonarqube -p '{"spec": {"type": "LoadBalancer"}}'

kubectl get svc 


---

## 12. (Production) Use External RDS Postgres & Ingress

- Add JDBC config in `values.yaml`
- Set up AWS RDS, and Ingress for access
- Use Kubernetes Secrets for passwords

---

# Explanations

## What is OIDC?

OpenID Connect (OIDC) lets AWS IAM trust Kubernetes service accounts as valid AWS identities. Your EKS cluster gets an OIDC endpoint, which is used in IAM trust relationships so pods can assume IAM roles without static credentials.

## What is IRSA?

IAM Roles for Service Accounts (IRSA) allows you to assign specific AWS IAM roles to Kubernetes service accounts. This means only the right pods can access AWS resources, following least-privilege principles.

## Why these steps?

- **OIDC/IRSA ensures AWS security best practices for pod permissions**
- **EBS CSI Add-on ensures reliable, secure storage for SonarQube**
- **Validations at each step prevent 99% of PVC/credential issues**

---

# Console vs Terminal: What to do where?

- **Terminal**: kubectl/eksctl/helm commands, OIDC, IRSA, deploy
- **AWS Console**: Assign IAM role to Add-on, inspect node group policies

---

# Troubleshooting Tips (If Ever Needed)

- Use `kubectl describe pvc ...` for error messages
- Check for correct OIDC in IAM trust relationship
- Confirm annotation on service account
- Restart CSI pods after IAM/annotation changes
- Only ONE EBS CSI driver method (Add-on OR Helm), never both

---

# Mentor’s Final Tips

- Follow steps exactly, in order
- Change `<cluster-name>`, `<region>`, `<account>` as needed
- For production, always use external DB & Ingress
- If stuck, check events and IAM policies first!

# sqa_84eb67203a2032c090f71b67c7e95ce4b4489ecc      ======> SONARTOKEN