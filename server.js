const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./Routes/users');
const overviewController = require('./Controllers/overviewController');
const contentRoutes = require('./Routes/contentRoute');
const overviewRoutes = require('./Routes/overviewRoutes');
const analyticsRoutes = require('./Routes/analyticsRoutes');
const contentManagerOverviewRoutes = require('./Routes/contentMgrOverviewRoute');
const resourceLibraryRoutes = require('./Routes/resourceLibrary');
const passwordResetRoutes = require('./Routes/passwordResetRoutes');
const fileRoutes = require("./Routes/fileRoute");
const AdminReportRoutes = require('./Routes/AdminReportRoutes');
const CMReportRoutes = require('./Routes/CMReportRoutes');

dotenv.config();

const app = express();

// ─────────────────────────────────────────────────────────────
// CORS — allow local dev + the Vercel deployment
// ─────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://ethiopian-it-park-frontend.vercel.app',
  // Any Vercel preview URLs (per-deployment hashes)
  /\.vercel\.app$/,
];

app.use(cors({
  origin: function (origin, callback) {
    // No origin = server-to-server or curl → allow
    if (!origin) return callback(null, true);

    const ok = allowedOrigins.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    callback(ok ? null : new Error('CORS: origin not allowed'), ok);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Answer preflight (OPTIONS) requests explicitly
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────
// Routes — unchanged
// ─────────────────────────────────────────────────────────────
app.use('/api/users', userRoutes);

app.get('/api/overview/summary', overviewController.getOverviewSummary);
app.use('/api/overview', overviewRoutes);

app.use('/api/content-manager', contentManagerOverviewRoutes);

//app.use('/uploads', express.static('uploads'));

app.use('/api', contentRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use('/api', resourceLibraryRoutes);

app.use("/api", passwordResetRoutes);

app.use("/api/files", fileRoutes);
app.use('/api/admin-reports', AdminReportRoutes);
app.use('/api/cm-reports', CMReportRoutes);

// ─────────────────────────────────────────────────────────────
// Health check — nice for Render / uptime monitoring
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ethiopian-it-park-backend' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
