# Ushasree Backend CI/CD Pipeline (Helm + ArgoCD) — **Explanation**

This document explains how the GitHub Actions workflow (`backend-ci-cd.yaml`) automates the CI/CD process for all backend microservices and the shared-resources Helm chart using GitOps and ArgoCD.

---

## **Workflow Triggers**

- **Runs on:**  
  Any `push` to the `main` branch that changes files in:
    - Any microservice directory (`api-gateway`, `auth-service`, etc.)
    - `shared-resources/helm/`
    - The workflow file itself
- **Why:**  
  Ensures every relevant change is built, tested, scanned, containerized, versioned, and deployed.

---

## **Workflow Jobs**

### **1. Microservices Matrix Job: `uss-backend-ci-cd`**

**Purpose:**  
Builds, tests, scans, and deploys each backend microservice in parallel.

**Matrix Strategy:**
- Runs the same steps for each listed service (`api-gateway`, `auth-service`, ...).

**Steps:**

1. **Checkout code**
    - Fetches the repository files.

2. **Set up Node.js**
    - Installs Node.js v18 for building/testing.

3. **Install dependencies**
    - Installs service dependencies with `npm install`.

4. **Run ESLint**
    - Runs lint checks to catch JavaScript/TypeScript errors (does not fail the build).

5. **SonarQube Scan**
    - Performs code quality and static analysis (SonarQube token/URL from secrets).

6. **Run Unit Tests**
    - Runs service unit tests.

7. **Log in to Docker Hub**
    - Authenticates to Docker Hub using stored secrets.

8. **Set version from git commit count**
    - Computes a version number based on the total number of commits in the repo (used as the Docker image tag).

9. **Build Docker image**
    - Builds the Docker image for the service with the computed version.

10. **Run Trivy vulnerability scanner**
    - Runs a container vulnerability scan (does not block the build on vulnerabilities).

11. **Push Docker image**
    - Pushes the image to Docker Hub.

12. **Install yq**
    - Installs `yq` for YAML editing.

13. **Update Helm values.yaml with new image tag**
    - Updates the `image.tag` field in `values.yaml` of the service's Helm chart to the new image tag.

14. **Show image tag after update**
    - Prints out the updated image tag for debugging.

15. **Commit and push updated values.yaml**
    - Commits and pushes the updated Helm values file back to the repository, triggering ArgoCD.

---

### **2. Shared Resources Job: `shared-resources-ci-cd`**

**Purpose:**  
Handles updates to the `shared-resources` Helm chart (for shared ConfigMap/Secret).

**Depends on:**  
Runs after `uss-backend-ci-cd` (ensures config/secret changes go out after microservice deploys).

**Steps:**

1. **Checkout code**
    - Fetches the repository files.

2. **Install yq**
    - Installs `yq` for YAML processing.

3. **Show current shared-resources values.yaml**
    - Prints out current shared resource config for debugging.

4. **Commit and push updated shared-resources values.yaml**
    - Commits and pushes changes to `values.yaml` (or any edits in `shared-resources/helm/`), so ArgoCD can sync those resources.

---

## **How ArgoCD Automates Deployment**

- **ArgoCD Application(s)** must be set up (once per service and for shared resources).
- When this pipeline pushes an updated `values.yaml` (with new image tags or config/secret values), **ArgoCD detects the change and automatically syncs the corresponding Helm chart** in the Kubernetes cluster.
- No manual `kubectl` or `helm` commands are needed for deployment—**all deployments are fully automated and traceable via Git history**.

---

## **Security**

- Uses GitHub Secrets for sensitive values (DockerHub credentials, SonarQube token).
- No secrets are printed to logs (other than showing non-secret config for debugging).

---

## **Best Practices in Use**

- **Matrix strategy** to efficiently run CI/CD for multiple services.
- **Versioned Docker images** (with traceable tags).
- **Static code analysis** (SonarQube).
- **Automated security scanning** (Trivy).
- **GitOps**: Kubernetes is always in sync with what’s in Git.

---

## **How to Extend**

- Add new microservices: simply append the name in the `matrix.service` list.
- To further automate, add deployment notifications, Slack alerts, or more scanning steps as needed.

---

**You are now running a fully automated, industry-standard GitOps workflow  
for microservices and shared resources with ArgoCD and Helm!**

---

*Maintained by Vishnu, guided by your AI mentor.*

