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
                    tags: ["Universal Action Engine"],

                    summary: "Execute a dynamic action",

                    description:
                        "Universal configuration-driven action execution. The action name is resolved dynamically from MongoDB. The engine resolves the configured Resource and Operation, or invokes a registered Handler action. No action-specific backend switch is required.",

                    security: [
                        {
                            ApiKeyAuth: []
                        },
                        {
                            BearerAuth: []
                        }
                    ],

                    requestBody: {
                        required: true,

                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/UniversalEngineRequest"
                                },

                                examples: {
                                    deviceBlock: {
                                        summary: "Block device",
                                        value: {
                                            action: "device.block",
                                            data: { id: "DEVICE_ID" }
                                        }
                                    },

                                    deviceUnblock: {
                                        summary: "Unblock device",
                                        value: {
                                            action: "device.unblock",
                                            data: { id: "DEVICE_ID" }
                                        }
                                    },

                                    dynamicTest: {
                                        summary: "Dynamic create",
                                        value: {
                                            action: "dynamic.test",
                                            data: {
                                                title: "Future Dynamic Test",
                                                randomNumber: 98765,
                                                customFlag: true
                                            }
                                        }
                                    },

                                    dynamicUpdate: {
                                        summary: "Dynamic update",
                                        value: {
                                            action: "dynamic.update",
                                            data: {
                                                id: "RESOURCE_ID",
                                                futureField: "updated-without-code-change"
                                            }
                                        }
                                    },

                                    fraudFlag: {
                                        summary: "Flag fraud",
                                        value: {
                                            action: "fraud.flag",
                                            data: { user: "USER_ID" }
                                        }
                                    },

                                    fraudRemoveFlag: {
                                        summary: "Remove fraud flag",
                                        value: {
                                            action: "fraud.remove_flag",
                                            data: { user: "USER_ID" }
                                        }
                                    },

                                    notificationBroadcast: {
                                        summary: "Broadcast notification",
                                        value: {
                                            action: "notification.broadcast",
                                            data: {
                                                title: "Announcement",
                                                message: "Hello users"
                                            }
                                        }
                                    },

                                    notificationSend: {
                                        summary: "Send notification",
                                        value: {
                                            action: "notification.send",
                                            data: {
                                                user: "USER_ID",
                                                title: "Notification",
                                                message: "Hello",
                                                type: "system"
                                            }
                                        }
                                    },

                                    rewardClawback: {
                                        summary: "Claw back reward",
                                        value: {
                                            action: "reward.clawback",
                                            data: {
                                                user: "USER_ID",
                                                amount: 1
                                            }
                                        }
                                    },

                                    rewardGrant: {
                                        summary: "Grant reward",
                                        value: {
                                            action: "reward.grant",
                                            data: {
                                                user: "USER_ID",
                                                amount: 1
                                            }
                                        }
                                    },

                                    systemPing: {
                                        summary: "System ping",
                                        value: {
                                            action: "system.ping",
                                            data: {}
                                        }
                                    },

                                    transactionCreate: {
                                        summary: "Create transaction",
                                        value: {
                                            action: "transaction.create",
                                            data: {
                                                user: "USER_ID",
                                                type: "credit",
                                                amount: 1
                                            }
                                        }
                                    },

                                    transactionFind: {
                                        summary: "Find transactions",
                                        value: {
                                            action: "transaction.find",
                                            data: {
                                                filter: { user: "USER_ID" }
                                            }
                                        }
                                    },

                                    transactionFindOne: {
                                        summary: "Find one transaction",
                                        value: {
                                            action: "transaction.findOne",
                                            data: {
                                                filter: { user: "USER_ID" }
                                            }
                                        }
                                    },

                                    userDelete: {
                                        summary: "Delete user",
                                        value: {
                                            action: "user.delete",
                                            data: { id: "USER_ID" }
                                        }
                                    },

                                    userRoleUpdate: {
                                        summary: "Update user role",
                                        value: {
                                            action: "user.role_update",
                                            data: {
                                                user: "USER_ID",
                                                role: "ROLE_ID"
                                            }
                                        }
                                    },

                                    userStatusUpdate: {
                                        summary: "Update user status",
                                        value: {
                                            action: "user.status_update",
                                            data: {
                                                user: "USER_ID",
                                                status: "active"
                                            }
                                        }
                                    },

                                    userUnsuspend: {
                                        summary: "Unsuspend user",
                                        value: {
                                            action: "user.unsuspend",
                                            data: { user: "USER_ID" }
                                        }
                                    },

                                    walletCredit: {
                                        summary: "Credit wallet",
                                        value: {
                                            action: "wallet.credit",
                                            data: {
                                                user: "USER_ID",
                                                amount: 1
                                            }
                                        }
                                    },

                                    walletDebit: {
                                        summary: "Debit wallet",
                                        value: {
                                            action: "wallet.debit",
                                            data: {
                                                user: "USER_ID",
                                                amount: 1
                                            }
                                        }
                                    },

                                    walletEnsure: {
                                        summary: "Ensure wallet",
                                        value: {
                                            action: "wallet.ensure",
                                            data: { user: "USER_ID" }
                                        }
                                    },

                                    walletPendingAdjust: {
                                        summary: "Adjust pending wallet balance",
                                        value: {
                                            action: "wallet.pending_adjust",
                                            data: {
                                                user: "USER_ID",
                                                amount: 1
                                            }
                                        }
                                    },

                                    walletView: {
                                        summary: "View wallet",
                                        value: {
                                            action: "wallet.view",
                                            data: { user: "USER_ID" }
                                        }
                                    },

                                    withdrawalApprove: {
                                        summary: "Approve withdrawal",
                                        value: {
                                            action: "withdrawal.approve",
                                            data: {
                                                withdrawalId: "WITHDRAWAL_ID"
                                            }
                                        }
                                    },

                                    withdrawalHold: {
                                        summary: "Hold withdrawal",
                                        value: {
                                            action: "withdrawal.hold",
                                            data: {
                                                withdrawalId: "WITHDRAWAL_ID"
                                            }
                                        }
                                    },

                                    withdrawalReject: {
                                        summary: "Reject withdrawal",
                                        value: {
                                            action: "withdrawal.reject",
                                            data: {
                                                withdrawalId: "WITHDRAWAL_ID"
                                            }
                                        }
                                    },

                                    withdrawalRequest: {
                                        summary: "Request withdrawal",
                                        value: {
                                            action: "withdrawal.request",
                                            data: {
                                                amount: 1
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },

                    responses: {
                        "200": {
                            description: "Action executed successfully",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/UniversalEngineResponse"
                                    }
                                }
                            }
                        },

                        "400": {
                            description: "Invalid request",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        },

                        "401": {
                            description: "Authentication failed",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        },

                        "404": {
                            description: "Action not found or disabled",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        },

                        "409": {
                            description: "Idempotency conflict or request still processing",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        },

                        "500": {
                            description: "Action execution failed",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        }
                    }
                }
            }}
    },

    apis: [
        "./routes/*.js"
    ]
};

module.exports = swaggerJsdoc(options);
