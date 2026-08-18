const swaggerJsdoc = require("swagger-jsdoc");

const productionUrl =
    process.env.API_BASE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : null);

const servers = [];

if (productionUrl) {
    servers.push({
        url: productionUrl,
        description: "Production Server"
    });
}

servers.push({
    url: "http://localhost:3000",
    description: "Local Development Server"
});

const options = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Earnify Global API",
            version: "2.0.0",
            description: "Global Reward Platform API"
        },

        servers,

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                },

                apiKeyAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "X-API-Key"
                }
            }
        }
    },

    apis: [
        "./routes/*.js"
    ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
