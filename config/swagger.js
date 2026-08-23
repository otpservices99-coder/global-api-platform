const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Global API Platform",
            version: "1.0.0",
            description:
                "Global Dynamic API Platform using a universal Action → Resource → Operation architecture. Actions are configuration-driven and can execute dynamically without adding action-specific backend code."
        },

        servers: [
            {
                url: "https://global-api-platform-production.up.railway.app",
                description: "Production"
            },
            {
                url: "http://localhost:3000",
                description: "Local development"
            }
        ],

        tags: [
            {
                name: "Universal Action Engine",
                description:
                    "Configuration-driven dynamic action execution"
            }
        ],

        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "X-API-Key"
                },

                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            },

            schemas: {
                UniversalEngineRequest: {
                    type: "object",
                    required: [
                        "action"
                    ],

                    properties: {
                        action: {
                            type: "string",
                            description:
                                "Name of the enabled Action configuration. The action does not need to be hard-coded into the engine.",

                            example: "dynamic.update"
                        },

                        data: {
                            type: "object",
                            description:
                                "Dynamic business data. Fields are configuration-driven and may vary between resources/actions.",

                            additionalProperties: true,

                            example: {
                                title: "Future Dynamic Test",
                                randomNumber: 98765,
                                customFlag: true,
                                futureField:
                                    "accepted-without-code-change",
                                completelyNewField:
                                    "no-code-change"
                            }
                        },

                        idempotencyKey: {
                            type: "string",
                            nullable: true,

                            description:
                                "Optional idempotency key for actions configured for idempotency.",

                            example:
                                "dynamic-test-001"
                        }
                    }
                },

                UniversalEngineResponse: {
                    type: "object",

                    properties: {
                        success: {
                            type: "boolean",
                            example: true
                        },

                        action: {
                            type: "string",
                            example: "dynamic.update"
                        },

                        result: {
                            type: "object",

                            additionalProperties: true,

                            description:
                                "Result returned by the dynamically resolved resource operation."
                        }
                    }
                },

                UniversalEngineError: {
                    type: "object",

                    properties: {
                        success: {
                            type: "boolean",
                            example: false
                        },

                        message: {
                            type: "string",
                            example:
                                "Action execution failed"
                        }
                    }
                }
            }
        },

        paths: {
            "/api/v1/engine": {
                post: {
                    tags: [
                        "Universal Action Engine"
                    ],

                    summary:
                        "Execute a dynamic action",

                    description:
                        "Executes an enabled Action through the Universal Action Engine. The engine resolves the Action, Resource, and Operation dynamically from database configuration. Resource operations are configuration-driven. Resources can accept arbitrary fields when no restrictive Schema is configured. New actions, resources, operations, and fields can therefore be introduced through configuration without adding action-specific backend code.",

                    security: [
                        {
                            ApiKeyAuth: []
                        }
                    ],

                    requestBody: {
                        required: true,

                        content: {
                            "application/json": {
                                schema: {
                                    $ref:
                                        "#/components/schemas/UniversalEngineRequest"
                                },

                                examples: {
                                    dynamicCreate: {
                                        summary:
                                            "Create dynamically",

                                        value: {
                                            action:
                                                "dynamic.test",

                                            data: {
                                                title:
                                                    "Future Dynamic Test",

                                                randomNumber:
                                                    98765,

                                                customFlag:
                                                    true,

                                                futureField:
                                                    "accepted-without-code-change",

                                                completelyNewField:
                                                    "no-code-change"
                                            }
                                        }
                                    },

                                    dynamicUpdate: {
                                        summary:
                                            "Update dynamically",

                                        value: {
                                            action:
                                                "dynamic.update",

                                            data: {
                                                id:
                                                    "6a8a44b21e3e32d69024a502",

                                                futureField:
                                                    "updated-without-code-change",

                                                anotherNewField:
                                                    "also-dynamic"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },

                    responses: {
                        "200": {
                            description:
                                "Action executed successfully",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/UniversalEngineResponse"
                                    }
                                }
                            }
                        },

                        "400": {
                            description:
                                "Invalid request",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        },

                        "404": {
                            description:
                                "Action not found or disabled",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        },

                        "409": {
                            description:
                                "Idempotency conflict or request still processing",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        },

                        "500": {
                            description:
                                "Action execution failed",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    apis: [
        "./routes/*.js"
    ]
};

module.exports = swaggerJsdoc(options);
