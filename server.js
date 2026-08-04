require("dotenv").config();


const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const connectDB = require("./config/database");


// Start background engines

require("./services/schedulerEngine");


// Middleware

const project =
require("./middleware/project");

const apiUsage =
require("./middleware/apiUsage");


// Routes

const homeRoute =
require("./routes/home");

const authRoute =
require("./routes/auth");

const userRoute =
require("./routes/user");

const adminRoute =
require("./routes/admin");

const walletRoute =
require("./routes/wallet");

const withdrawalRoute =
require("./routes/withdrawal");

const dashboardRoute =
require("./routes/dashboard");

const adminDashboardRoute =
require("./routes/adminDashboard");

const adminWithdrawalRoute =
require("./routes/adminWithdrawal");

const adminUsersRoute =
require("./routes/adminUsers");

const adminImpersonationRoute =
require("./routes/adminImpersonation");

const adminWalletRoute =
require("./routes/adminWallet");

const projectRoute =
require("./routes/project");

const settingsRoute =
require("./routes/settings");

const notificationRoute =
require("./routes/notification");

const searchRoute =
require("./routes/search");

const auditRoute =
require("./routes/audit");

const statsRoute =
require("./routes/stats");

const platformRoute =
require("./routes/platform");

const eventRoute =
require("./routes/events");

const recordsRoute =
require("./routes/records");

const resourceRoute =
require("./routes/resources");

const workflowRoute =
require("./routes/workflows");

const platformAdminRoute =
require("./routes/platformAdmin");

const controlCenterRoute =
require("./routes/controlCenter");


// NEW RESOURCE MANAGER

const resourceManagerRoute =
require("./routes/resourceManager");

const schemaManagerRoute =
require("./routes/schemaManager");

// App

const app = express();


// Database

connectDB();



// Global middleware

app.use(
cors()
);


app.use(
helmet({
contentSecurityPolicy:false
})
);


app.use(
morgan("dev")
);


app.use(
express.json()
);


app.use(
express.urlencoded({
extended:true
})
);



// Swagger

app.use(
"/api-docs",
swaggerUi.serve,
swaggerUi.setup(swaggerSpec)
);


app.get(
"/api-docs/swagger.json",
(req,res)=>{

res.json(swaggerSpec);

}
);



// Home

app.use(
"/",
homeRoute
);



// Authentication

app.use(
"/api/auth",
authRoute
);



// User

app.use(
"/api/user",
userRoute
);



// Admin

app.use(
"/api/v1/admin",
project,
apiUsage,
adminRoute
);



// Wallet

app.use(
"/api/v1/wallet",
project,
apiUsage,
walletRoute
);



// Dashboard

app.use(
"/api/v1/dashboard",
project,
apiUsage,
dashboardRoute
);



// Withdrawals

app.use(
"/api/v1/withdrawals",
project,
apiUsage,
withdrawalRoute
);



// Admin Dashboard

app.use(
"/api/v1/admin/dashboard",
project,
apiUsage,
adminDashboardRoute
);



// Admin Withdrawals

app.use(
"/api/v1/admin/withdrawals",
project,
apiUsage,
adminWithdrawalRoute
);



// Admin Users

app.use(
"/api/v1/admin/users",
project,
apiUsage,
adminUsersRoute
);



// Admin Wallet

app.use(
"/api/v1/admin/wallet",
project,
apiUsage,
adminWalletRoute
);



// Impersonation

app.use(
"/api/v1/admin/impersonate",
adminImpersonationRoute
);



// Audit

app.use(
"/api/v1/admin/audit",
project,
apiUsage,
auditRoute
);



// Stats

app.use(
"/api/v1/admin/stats",
project,
apiUsage,
statsRoute
);



// Projects

app.use(
"/api/v1/admin/projects",
projectRoute
);



// Settings

app.use(
"/api/v1/settings",
project,
apiUsage,
settingsRoute
);



// Notifications

app.use(
"/api/v1/notifications",
project,
apiUsage,
notificationRoute
);



// Search

app.use(
"/api/v1/search",
project,
apiUsage,
searchRoute
);



// Platform

app.use(
"/api/v1/platform",
platformRoute
);



// Events

app.use(
"/api/v1/events",
project,
apiUsage,
eventRoute
);



// Records

app.use(
"/api/v1/records",
project,
apiUsage,
recordsRoute
);



// Resources

app.use(
"/api/v1/resources",
project,
apiUsage,
resourceRoute
);



// Resource Manager

app.use(
"/api/v1/resource-manager",
project,
apiUsage,
resourceManagerRoute
);



// Schema Manager

app.use(
"/api/v1/schema-manager",
project,
apiUsage,
schemaManagerRoute
);



// Workflows

app.use(
"/api/v1/workflows",
project,
apiUsage,
workflowRoute
);



// Super Admin Platform

app.use(
"/api/v1/platform/admin",
platformAdminRoute
);


// Admin Control Center

app.use(
"/api/v1/admin/control-center",
controlCenterRoute
);



// 404

app.use(
(req,res)=>{

res.status(404).json({

success:false,

message:"Route not found"

});

}
);



// Error handler

app.use(
(err,req,res,next)=>{

console.error(err);

res.status(500).json({

success:false,

message:"Internal server error"

});

}
);



// Server

const PORT =
process.env.PORT || 3000;


app.listen(
PORT,
()=>{

console.log(
`🚀 Global Platform API running on port ${PORT}`
);

}
);
