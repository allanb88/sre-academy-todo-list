const fs = require("fs");
const path = require("path");

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const morgan = require("morgan");

// OpenTelemetry imports
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const {
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");
const { registerInstrumentations } = require("@opentelemetry/instrumentation");
const {
  ExpressInstrumentation,
} = require("@opentelemetry/instrumentation-express");
const {
  MongoDBInstrumentation,
} = require("@opentelemetry/instrumentation-mongodb");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");

// Prometheus metrics
const client = require("prom-client");

// Initialize OpenTelemetry
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "backend-service",
  }),
});

// OTLP exporter (to Jaeger or OpenTelemetry Collector)
const exporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    "http://otel-collector:4318/v1/traces",
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

// Register instrumentations
registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new MongoDBInstrumentation(),
  ],
});

const Goal = require("./models/goal");

const app = express();

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "status_code"],
  buckets: [50, 100, 200, 300, 400, 500, 750, 1000, 2000, 5000],
});

const goalsCounter = new client.Counter({
  name: "goals_operations_total",
  help: "Total number of goals operations",
  labelNames: ["operation", "status"],
});

const validationErrorsCounter = new client.Counter({
  name: "validation_errors_total",
  help: "Total number of validation errors",
  labelNames: ["error_type"],
});

// Register custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(goalsCounter);
register.registerMetric(validationErrorsCounter);

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "logs", "access.log"),
  { flags: "a" }
);

app.use(morgan("combined", { stream: accessLogStream }));

app.use(bodyParser.json());

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });

  next();
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

app.get("/goals", async (req, res) => {
  console.log("TRYING TO FETCH GOALS");
  try {
    const goals = await Goal.find();
    res.status(200).json({
      goals: goals.map((goal) => ({
        id: goal.id,
        text: goal.text,
      })),
    });
    goalsCounter.labels("fetch", "success").inc();
    console.log("FETCHED GOALS");
  } catch (err) {
    console.error("ERROR FETCHING GOALS");
    console.error(err.message);
    goalsCounter.labels("fetch", "error").inc();
    res.status(500).json({ message: "Fallo al cargar los Items." });
  }
});

app.post("/goals", async (req, res) => {
  console.log("TRYING TO STORE GOAL");
  const goalText = req.body.text;

  if (!goalText || goalText.trim().length === 0) {
    console.log("INVALID INPUT - NO TEXT");
    validationErrorsCounter.labels("empty_text").inc();
    return res.status(422).json({ message: "Texto Invalido." });
  }

  // Validación extra: solo números
  if (/^\d+$/.test(goalText.trim())) {
    console.log("valor incorrecto - solo números");
    validationErrorsCounter.labels("only_numbers").inc();
    return res
      .status(422)
      .json({ message: "El Item no puede ser unicamente numerico." });
  }

  // Nueva validación: máximo 10 caracteres
  if (goalText.trim().length > 10) {
    console.log("Valor incorrecto - más de 10 caracteres");
    validationErrorsCounter.labels("max_length_exceeded").inc();
    return res
      .status(413)
      .json({ message: "El texto no puede tener más de 10 caracteres." });
  }

  const goal = new Goal({
    text: goalText,
  });

  try {
    await goal.save();
    res
      .status(201)
      .json({ message: "Goal saved", goal: { id: goal.id, text: goalText } });
    goalsCounter.labels("create", "success").inc();
    console.log("STORED NEW GOAL");
  } catch (err) {
    console.error("ERROR SAVING GOAL");
    console.error(err.message);
    goalsCounter.labels("create", "error").inc();
    res.status(500).json({ message: "Failed to save goal." });
  }
});

app.delete("/goals/:id", async (req, res) => {
  console.log("TRYING TO DELETE GOAL");
  try {
    await Goal.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: "Deleted goal!" });
    goalsCounter.labels("delete", "success").inc();
    console.log("DELETED GOAL");
  } catch (err) {
    console.error("ERROR DELETING GOAL");
    console.error(err.message);
    goalsCounter.labels("delete", "error").inc();
    res.status(500).json({ message: "Failed to delete goal." });
  }
});

mongoose.connect(
  `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@mongodb:27017/course-goals?authSource=admin`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) {
      console.error("FAILED TO CONNECT TO MONGODB");
      console.error(err);
    } else {
      console.log("CONNECTED TO MONGODB!!");
      app.listen(80);
    }
  }
);
