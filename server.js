const express = require("express");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

const connectDB = require("./config/db");
const createDefaultAdmin = require("./utils/createDefaultAdmin");
const socketHandler = require("./sockets/socketHandler");

dotenv.config();

connectDB().then(async () => {
  await createDefaultAdmin();
});

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('🚍 Bus Tracking API is running...');
});


const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Too many requests, please try again later"
  }
});

app.use(limiter);


const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20
});

app.use('/api/v1/auth', authLimiter, require('./routes/v1/auth.routes'));

const locationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});
app.use('/api/v1/location', locationLimiter ,require('./routes/v1/locationRoutes'));
// Routes
app.use('/api/v1/admin', require('./routes/v1/admin.routes'));
app.use('/api/v1/drivers', require('./routes/v1/driver.routes'));
app.use('/api/v1/buses', require('./routes/v1/bus.routes'));
app.use('/api/v1/students', require('./routes/v1/student.routes'));
app.use('/api/v1/notice', require('./routes/v1/notice.routes'));
app.use('/api/v1/notification', require('./routes/v1/notification.routes'));



const server = http.createServer(app);


const io = new Server(server, {
  cors: { origin: "*" }
});

socketHandler(io);


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚍 Server running on port ${PORT}`);
});