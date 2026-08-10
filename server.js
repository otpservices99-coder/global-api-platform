process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
});

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const connectDB = require("./config/database");


// ============================================================
// BACKGROUND ENGINES
// ============================================================

require("./services/schedulerEngine");

require("./handlers");


// ============================================================
// MIDDLEWARE
// ============================================================

const project =
    require("./middleware/project");

const apiUsage =
    require("./middleware/apiUsage");


// ============================================================
// ROUTES
// ============================================================

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

const adminTransactionRoute =
    require("./routes/adminTransaction");

const projectRoute =
    require("./routes/project");

const settingsRoute =
    require("./routes/settings");

const notificationRoute =
    require("./routes/notifications");

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

const actionsRoute =
    require("./routes/actions");

const workflowExecutionRoute =
    require("./routes/workflowExecutions");

const handlersRoute =
    require("./routes/handlers");

const searchRoute =
    require("./routes/search");

const adminNotificationsRoute =
    require("./routes/adminNotifications");

const apiKeyRoute =
    require("./routes/apiKeys");


// ============================================================
// RESOURCE MANAGER
// ============================================================

const resourceManagerRoute =
    require("./routes/resourceManager");

const schemaManagerRoute =
    require("./routes/schemaManager");


// ============================================================
// ROLE TEST
// ============================================================

const roleTestRoute =
    require("./routes/roleTest");


// ============================================================
// APP
// ============================================================

const app = express();


// ============================================================
// DATABASE
// ============================================================

connectDB();


// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================

app.use(
    cors()
);

app.use(
    helmet({
        contentSecurityPolicy: false
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
        extended: true
    })
);


// ============================================================
// SWAGGER
// ============================================================

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

app.get(
    "/api-docs/swagger.json",
    (req, res) => {
        res.json(swaggerSpec);
    }
);


// ============================================================
// HOME
// ============================================================

app.use(
    "/",
    homeRoute
);


// ============================================================
// AUTHENTICATION
// ============================================================

app.use(
    "/api/auth",
    authRoute
);


// ============================================================
// USER
// ============================================================

app.use(
    "/api/user",
    userRoute
);


// ============================================================
// ADMIN ROOT
// ============================================================

app.use(
    "/api/v1/admin",
    project,
    apiUsage,
    adminRoute
);


// ============================================================
// USER WALLET
// ============================================================

app.use(
    "/api/v1/wallet",
    project,
    apiUsage,
    walletRoute
);


// ============================================================
// USER DASHBOARD
// ============================================================

app.use(
    "/api/v1/dashboard",
    project,
    apiUsage,
    dashboardRoute
);


// ============================================================
// USER WITHDRAWALS
// ============================================================

app.use(
    "/api/v1/withdrawals",
    project,
    apiUsage,
    withdrawalRoute
);


// ============================================================
// ADMIN DASHBOARD
// ============================================================

app.use(
    "/api/v1/admin/dashboard",
    project,
    apiUsage,
    adminDashboardRoute
);


// ============================================================
// ADMIN WITHDRAWALS
// ============================================================

app.use(
    "/api/v1/admin/withdrawals",
    project,
    apiUsage,
    adminWithdrawalRoute
);


// ============================================================
// ADMIN USERS
// ============================================================

app.use(
    "/api/v1/admin/users",
    project,
    apiUsage,
    adminUsersRoute
);


// ============================================================
// ADMIN WALLET
// ============================================================

app.use(
    "/api/v1/admin/wallet",
    project,
    apiUsage,
    adminWalletRoute
);


// ============================================================
// ADMIN TRANSACTIONS
// ============================================================

app.use(
    "/api/v1/admin/transactions",
    project,
    apiUsage,
    adminTransactionRoute
);


// ============================================================
// ADMIN IMPERSONATION
// ============================================================

app.use(
    "/api/v1/admin/impersonate",
    adminImpersonationRoute
);


// ============================================================
// ADMIN AUDIT
// ============================================================

app.use(
    "/api/v1/admin/audit",
    project,
    apiUsage,
    auditRoute
);


// ============================================================
// ADMIN STATS
// ============================================================

app.use(
    "/api/v1/admin/stats",
    project,
    apiUsage,
    statsRoute
);


// ============================================================
// PROJECTS
// ============================================================

app.use(
    "/api/v1/admin/projects",
    projectRoute
);


// ============================================================
// SETTINGS
// ============================================================

app.use(
    "/api/v1/settings",
    project,
    apiUsage,
    settingsRoute
);


// ============================================================
// USER NOTIFICATIONS
// ============================================================

app.use(
    "/api/v1/notifications",
    project,
    apiUsage,
    notificationRoute
);


// ============================================================
// SEARCH
// ============================================================

app.use(
    "/api/v1/search",
    project,
    apiUsage,
    searchRoute
);


// ============================================================
// PLATFORM
// ============================================================

app.use(
    "/api/v1/platform",
    platformRoute
);


// ============================================================
// EVENTS
// ============================================================

app.use(
    "/api/v1/events",
    project,
    apiUsage,
    eventRoute
);


// ============================================================
// RECORDS
// ============================================================

app.use(
    "/api/v1/records",
    project,
    apiUsage,
    recordsRoute
);


// ============================================================
// RESOURCES
// ============================================================

app.use(
    "/api/v1/resources",
    project,
    apiUsage,
    resourceRoute
);


// ============================================================
// RESOURCE MANAGER
// ============================================================

app.use(
    "/api/v1/resource-manager",
    project,
    apiUsage,
    resourceManagerRoute
);


// ============================================================
// SCHEMA MANAGER
// ============================================================

app.use(
    "/api/v1/schema-manager",
    project,
    apiUsage,
    schemaManagerRoute
);


// ============================================================
// WORKFLOWS
// ============================================================

app.use(
    "/api/v1/workflows",
    project,
    apiUsage,
    workflowRoute
);


// ============================================================
// SUPER ADMIN PLATFORM
// ============================================================

app.use(
    "/api/v1/platform/admin",
    platformAdminRoute
);


// ============================================================
// ADMIN CONTROL CENTER
// ============================================================

app.use(
    "/api/v1/admin/control-center",
    controlCenterRoute
);


// ============================================================
// DYNAMIC ACTIONS
// ============================================================

app.use(
    "/api/v1/actions",
    project,
    apiUsage,
    actionsRoute
);


// ============================================================
// ROLE TEST
// ============================================================

app.use(
    "/api/v1/role-test",
    roleTestRoute
);


// ============================================================
// WORKFLOW EXECUTIONS
// ============================================================

app.use(
    "/api/v1/workflow-executions",
    workflowExecutionRoute
);


// ============================================================
// HANDLERS
// ============================================================

app.use(
    "/api/v1/handlers",
    handlersRoute
);


// ============================================================
// ADMIN NOTIFICATIONS
// ============================================================

app.use(
    "/api/v1/admin/notifications",
    project,
    apiUsage,
    adminNotificationsRoute
);


// ============================================================
// API KEYS
// ============================================================

app.use(
    "/api/v1/admin/api-keys",
    project,
    apiUsage,
    apiKeyRoute
);


// ============================================================
// 404
// ============================================================

app.use(
    (req, res) => {

        res.status(404).json({
            success: false,
            message: "Route not found"
        });

    }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "GLOBAL ERROR:",
            err
        );

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }
);


// ============================================================
// SERVER
// ============================================================

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    () => {

        console.log(
            `🚀 Global Platform API running on port ${PORT}`
        );

    }
);
