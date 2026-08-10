const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Earnify Global API",
            version: "2.0.0",
            description: "Global Reward Platform API"
        },

        servers: [
            {
                url: "https://global-api-platform.onrender.com",
                description: "Production Server"
            },
            {
                url: "http://localhost:3000",
                description: "Local Development Server"
            }
        ],

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
