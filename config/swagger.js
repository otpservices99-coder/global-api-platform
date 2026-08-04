const swaggerJsdoc = require("swagger-jsdoc");

const swaggerSpec = swaggerJsdoc({

    definition: {

        openapi: "3.0.0",

        info: {

            title: "Earnify Global API",

            version: "2.0.0",

            description:
                "Global Reward Platform API"

        },

        servers: [

            {
                url: "http://localhost:3000",
                description: "Development Server"
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

});

module.exports = swaggerSpec;
