const express = require('express');
const cors =require('cors');
const dotenv=require('dotenv');
const userRoutes = require('./Routes/users');
const overviewController =require('./Controllers/overviewController');
const contentRoutes = require('./Routes/contentRoute');
const overviewRoutes=require('./Routes/overviewRoutes');
const analyticsRoutes= require('./Routes/analyticsRoutes');
const contentManagerOverviewRoutes = require('./Routes/contentMgrOverviewRoute');
const resourceLibraryRoutes = require('./Routes/resourceLibrary');
const passwordResetRoutes = require('./Routes/passwordResetRoutes');
const fileRoutes = require("./Routes/fileRoute");
const AdminReportRoutes = require('./Routes/AdminReportRoutes');
const CMReportRoutes = require('./Routes/CMReportRoutes');



dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/users',userRoutes);

app.get('/api/overview/summary', overviewController.getOverviewSummary);
app.use('/api/overview',overviewRoutes);

app.use('/api/content-manager', contentManagerOverviewRoutes);

//app.use('/uploads', express.static('uploads'));

app.use('/api', contentRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use('/api', resourceLibraryRoutes);

app.use("/api", passwordResetRoutes);

app.use("/api/files", fileRoutes);
app.use('/api/admin-reports', AdminReportRoutes);
app.use('/api/cm-reports', CMReportRoutes);



const port = process.env.PORT||3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});