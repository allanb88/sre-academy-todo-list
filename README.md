# SRE Todo List

A simple, end-to-end **Todo List application** designed to demonstrate practical **Site Reliability Engineering (SRE)** principles using containerized services, Kubernetes, OpenTelemetry, and Prometheus.

This project showcases the orchestration of a full stack composed of:

- **Frontend:** React
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **Telemetry Collector:** OpenTelemetry
- **Monitoring & Metrics:** Prometheus
- **Alerting:** Email alerts via Gmail SMTP
- **Orchestration:** Single multi-service deployment running on Minikube

---

## ✅ Overview

This project is intentionally lightweight but feature-complete. It demonstrates how to:

- Build and containerize a multi-service app (frontend, backend, database)
- Deploy the entire stack in Minikube using Kubernetes manifests
- Instrument backend code using **OpenTelemetry**
- Expose business and reliability metrics to **Prometheus**
- Trigger **alerting workflows** via email
- Implement basic SRE best practices such as:
  - Structured logging
  - Metrics pipeline
  - Health endpoints
  - Resource separation across pods/services

---

## 📦 Architecture

┌─────────┐ ┌──────────┐ ┌───────────────┐
│ React │ ---> │ Node.js │ ---> │ OpenTelemetry │
│ Frontend│ │ Backend │ │ Collector │
└─────┬───┘ └──────┬───┘ └───────┬───────┘
│ │ │
▼ ▼ ▼
┌───────────┐ ┌────────────┐
│ MongoDB │ │ Prometheus │
└───────────┘ └────────────┘

A single Kubernetes deployment located at the root of the repository orchestrates the entire ecosystem under Minikube.

All service ports are **fixed and exposed** internally to simplify testing and instrumentation.

---

## 📊 Telemetry, Metrics & Alerting

The backend service is instrumented using **OpenTelemetry**.  
Prometheus scrapes metrics exposed from the backend and collector.

### Custom Metrics

Two domain-specific metrics are generated based on user input:

1. **`todo_input_long_total`**

   - Increments each time a user creates an item with **more than 10 characters**.

2. **`todo_input_numeric_total`**
   - Increments when the added input is **purely numeric**.

These metrics enable observability of user patterns and input anomalies.

### Email Alerting

Prometheus rules can be configured to send notifications when metric thresholds are met.

Email alerts are sent using **Gmail SMTP** to:

allanbs.88@gmail.com

This demonstrates end-to-end alerting for SRE workflows.

---

## 🚀 Deployment on Minikube

### Requirements

- Docker / Podman
- Minikube
- kubectl
- Prometheus operator (optional)
- Node.js & npm (if modifying the backend)
- A Gmail SMTP app password (for alerting)

### Run the full ecosystem

From the root of the project:

```sh
minikube start
kubectl apply -f deployment.yaml

This creates:

    React frontend pod & service

    Node backend pod & service

    MongoDB pod & service

    OpenTelemetry Collector pod

    Prometheus deployment & service

You can then forward ports for local access:

kubectl port-forward svc/frontend 3000:3000
kubectl port-forward svc/backend 8080:8080
kubectl port-forward svc/prometheus 9090:9090

🧪 Features Demonstrated

    Multi-container architecture

    Kubernetes orchestration

    Configuring OpenTelemetry SDK & Collector

    Exposing custom business metrics

    Prometheus scraping & rule evaluation

    Email alerting workflow

    Full reproducibility via a single deployment file

    SRE foundations: metrics, monitoring, alerting, observability

📁 Project Structure

sre-todo-list/
│
├── backend/
│   ├── index.js
│   ├── telemetry.js
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   └── Dockerfile
│
├── manifests/
│   ├── mongodb.yaml
│   ├── backend.yaml
│   ├── frontend.yaml
│   ├── opentelemetry-collector.yaml
│   └── prometheus.yaml
│
└── deployment.yaml   <--- master orchestrator

🔧 Environment Variables

Backend requires:

MONGODB_URI=mongodb://mongodb:27017/todos
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
SMTP_USER="your-gmail"
SMTP_PASS="your-gmail-app-password"
ALERT_EMAIL="allanbs.88@gmail.com"

📜 License

This project is provided under a Free Academic Use License.
It may be used, shared, and modified for personal educational
purposes. Commercial use or redistribution is prohibited.

🙌 Author

Developed as part of an SRE training and demonstration project.

If you want, I can help you generate the actual Kubernetes manifests or the instrumentation code for the metrics.
```
