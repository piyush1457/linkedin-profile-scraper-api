const express = require("express");
const profileRoutes = require("./routes/profile");
const healthRoutes = require("./routes/health");
const { rateLimit } = require("./middleware/rateLimit");
const { timeout } = require("./middleware/timeout");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(rateLimit());
app.use(timeout());

app.use(healthRoutes);
app.use(profileRoutes);

app.use(errorHandler);

module.exports = app;
