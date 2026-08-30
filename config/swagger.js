const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Global API Platform",
            version: "1.0.0",
            description:
                "Global Dynamic API Platform using a universal Action → Resource → Operation architecture, including earning/ad session tracking."
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
            },
            {
                name: "Earn",
                description:
                    "Earning offers, ad-click sessions, session status and provider postbacks"
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
                    required: ["action"],
                    properties: {
                        action: {
                            type: "string",
                            description:
                                "Name of the enabled Action configuration.",
                            example: "dynamic.update"
                        },

                        data: {
                            type: "object",
                            additionalProperties: true,
                            description:
                                "Dynamic business data.",
                            example: {
                                title: "Future Dynamic Test",
                                randomNumber: 98765,
                                customFlag: true
                            }
                        },

                        idempotencyKey: {
                            type: "string",
                            nullable: true,
                            description:
                                "Optional idempotency key.",
                            example: "dynamic-test-001"
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
                            additionalProperties: true
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
                            example: "Action execution failed"
                        }
                    }
                },

                AccountSuspendedError: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: false
                        },

                        code: {
                            type: "string",
                            example: "ACCOUNT_SUSPENDED"
                        },

                        message: {
                            type: "string",
                            example:
                                "Your account is suspended. Contact support."
                        }
                    }
                },

                AccountBlockedError: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: false
                        },

                        code: {
                            type: "string",
                            example: "ACCOUNT_BLOCKED"
                        },

                        message: {
                            type: "string",
                            example:
                                "Your account is blocked. Contact support."
                        }
                    }
                },

                EarnSessionRequest: {
                    type: "object",
                    required: ["provider"],
                    properties: {
                        provider: {
                            type: "string",
                            description:
                                "Configured earning/ad provider key.",
                            example: "adcash"
                        },

                        placement: {
                            type: "string",
                            nullable: true,
                            description:
                                "Optional configured provider placement.",
                            example: "banner"
                        }
                    }
                },

                EarnSessionResponse: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: true
                        },

                        sessionId: {
                            type: "string",
                            description:
                                "Unique earning session ID. Send this value to the provider as its tracking/sub1/session parameter.",
                            example: "66c8f0b4d7e123456789abcd"
                        },

                        userReward: {
                            type: "number",
                            example: 20
                        },

                        provider: {
                            type: "string",
                            example: "adcash"
                        },

                        placement: {
                            type: "string",
                            nullable: true,
                            example: "banner"
                        },

                        expiresAt: {
                            type: "string",
                            format: "date-time",
                            example: "2026-08-23T12:30:00.000Z"
                        }
                    }
                },

                EarnOffer: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            example: "adcash:banner"
                        },

                        title: {
                            type: "string",
                            example: "AdCash Banner"
                        },

                        provider: {
                            type: "string",
                            example: "adcash"
                        },

                        type: {
                            type: "string",
                            example: "ad"
                        },

                        userReward: {
                            type: "number",
                            example: 20
                        }
                    }
                },

                EarnOffersResponse: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: true
                        },

                        offers: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/EarnOffer"
                            }
                        }
                    }
                },

                EarnPostbackResponse: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: true
                        },

                        credited: {
                            type: "boolean",
                            example: true
                        },

                        duplicate: {
                            type: "boolean",
                            example: false
                        },

                        amount: {
                            type: "number",
                            example: 20
                        },

                        userId: {
                            type: "string",
                            example: "66c8f0b4d7e123456789abcd"
                        },

                        transactionId: {
                            type: "string",
                            nullable: true,
                            example: "66c8f0b4d7e123456789abce"
                        },

                        message: {
                            type: "string",
                            nullable: true,
                            example: "Postback already processed"
                        }
                    }
                }
            }
        },

        paths: {
            "/api/v1/earn/offers": {
                get: {
                    tags: ["Earn"],

                    summary: "Get available earning offers",

                    description:
                        "Returns the enabled earning/ad providers and placements available to the authenticated user/project. This endpoint does not credit the wallet.",

                    security: [
                        {
                            ApiKeyAuth: []
                        },
                        {
                            BearerAuth: []
                        }
                    ],

                    responses: {
                        "200": {
                            description:
                                "Available earning offers returned successfully.",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/EarnOffersResponse"
                                    },

                                    example: {
                                        success: true,

                                        offers: [
                                            {
                                                id: "adcash:banner",
                                                title: "AdCash Banner",
                                                provider: "adcash",
                                                type: "ad",
                                                userReward: 20
                                            }
                                        ]
                                    }
                                }
                            }
                        },

                        "401": {
                            description:
                                "Authentication failed.",

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
                                "Unable to load earning offers.",

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
            },

            "/api/v1/earn/session": {
                post: {
                    tags: ["Earn"],

                    summary: "Create an earning/ad tracking session",

                    description:
                        "Creates a short-lived pending earning session when the user starts an earning offer. The returned sessionId is the tracking identifier that should be passed to the advertising provider. Creating a session does not credit the wallet.",

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
                                    $ref:
                                        "#/components/schemas/EarnSessionRequest"
                                },

                                examples: {
                                    adClick: {
                                        summary:
                                            "Start tracking an ad click",

                                        value: {
                                            provider: "adcash",
                                            placement: "banner"
                                        }
                                    },

                                    providerOnly: {
                                        summary:
                                            "Start provider session without placement",

                                        value: {
                                            provider: "adcash"
                                        }
                                    }
                                }
                            }
                        }
                    },

                    responses: {
                        "201": {
                            description:
                                "Earning session created successfully.",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/EarnSessionResponse"
                                    },

                                    example: {
                                        success: true,
                                        sessionId:
                                            "66c8f0b4d7e123456789abcd",
                                        userReward: 20,
                                        provider: "adcash",
                                        placement: "banner",
                                        expiresAt:
                                            "2026-08-23T12:30:00.000Z"
                                    }
                                }
                            }
                        },

                        "400": {
                            description:
                                "Invalid provider, placement or project context.",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        },

                        "401": {
                            description:
                                "Authenticated user is required.",

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
                                "Earning provider or configuration unavailable.",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        },

                        "429": {
                            description:
                                "Daily earning limit reached.",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/UniversalEngineError"
                                    },

                                    example: {
                                        success: false,
                                        message:
                                            "Daily earning limit reached"
                                    }
                                }
                            }
                        },

                        "500": {
                            description:
                                "Unable to create earning session.",

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
            },

            "/api/v1/earn/postback/{provider}": {
                post: {
                    tags: ["Earn"],

                    summary: "Receive provider earning postback",

                    description:
                        "Provider callback endpoint. The provider sends the external transaction ID and the earning session ID. The backend verifies the provider secret, prevents duplicate transactions, validates the pending session and then processes the completed earning.",

                    parameters: [
                        {
                            name: "provider",
                            in: "path",
                            required: true,
                            description:
                                "Configured earning provider key.",
                            schema: {
                                type: "string"
                            },
                            example: "adcash"
                        },

                        {
                            name: "X-Postback-Secret",
                            in: "header",
                            required: false,
                            description:
                                "Provider postback secret.",
                            schema: {
                                type: "string"
                            }
                        }
                    ],

                    requestBody: {
                        required: true,

                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",

                                    properties: {
                                        transaction_id: {
                                            type: "string",
                                            example: "provider-tx-12345"
                                        },

                                        sessionId: {
                                            type: "string",
                                            example:
                                                "66c8f0b4d7e123456789abcd"
                                        },

                                        sub1: {
                                            type: "string",
                                            description:
                                                "Alternative provider parameter accepted as the earning session ID.",
                                            example:
                                                "66c8f0b4d7e123456789abcd"
                                        },

                                        status: {
                                            type: "string",
                                            example: "completed"
                                        }
                                    }
                                },

                                example: {
                                    transaction_id:
                                        "provider-tx-12345",

                                    sessionId:
                                        "66c8f0b4d7e123456789abcd",

                                    status: "completed"
                                }
                            }
                        }
                    },

                    responses: {
                        "200": {
                            description:
                                "Postback processed successfully.",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/EarnPostbackResponse"
                                    }
                                }
                            }
                        },

                        "400": {
                            description:
                                "Required transaction or session identifier missing.",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        },

                        "403": {
                            description:
                                "Invalid provider postback secret.",

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
                                "Session, provider or configuration not found.",

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
                                "Earning session is no longer pending.",

                            content: {
                                "application/json": {
                                    schema: {
                                        $ref:
                                            "#/components/schemas/UniversalEngineError"
                                    }
                                }
                            }
                        },

                        "410": {
                            description:
                                "Earning session expired.",

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
                                "Postback processing failed.",

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
            },

            "/api/v1/engine": {
                post: {
                    tags: ["Universal Action Engine"],

                    summary: "Execute a dynamic action",

                    description:
                        "Universal configuration-driven action execution. The action name is resolved dynamically from MongoDB.",

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
                                    $ref:
                                        "#/components/schemas/UniversalEngineRequest"
                                },

                                examples: {
                                    deviceBlock: {
                                        summary: "Block device",

                                        value: {
                                            action: "device.block",
                                            data: {
                                                id: "DEVICE_ID"
                                            }
                                        }
                                    },

                                    deviceUnblock: {
                                        summary: "Unblock device",

                                        value: {
                                            action: "device.unblock",
                                            data: {
                                                id: "DEVICE_ID"
                                            }
                                        }
                                    },

                                    dynamicTest: {
                                        summary: "Dynamic create",

                                        value: {
                                            action: "dynamic.test",
                                            data: {
                                                title:
                                                    "Future Dynamic Test",
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
                                                futureField:
                                                    "updated-without-code-change"
                                            }
                                        }
                                    },

                                    fraudFlag: {
                                        summary: "Flag fraud",

                                        value: {
                                            action: "fraud.flag",
                                            data: {
                                                user: "USER_ID"
                                            }
                                        }
                                    },

                                    fraudRemoveFlag: {
                                        summary:
                                            "Remove fraud flag",

                                        value: {
                                            action:
                                                "fraud.remove_flag",

                                            data: {
                                                user: "USER_ID"
                                            }
                                        }
                                    },

                                    notificationBroadcast: {
                                        summary:
                                            "Broadcast notification",

                                        value: {
                                            action:
                                                "notification.broadcast",

                                            data: {
                                                title:
                                                    "Announcement",

                                                message:
                                                    "Hello users"
                                            }
                                        }
                                    },

                                    notificationSend: {
                                        summary:
                                            "Send notification",

                                        value: {
                                            action:
                                                "notification.send",

                                            data: {
                                                user: "USER_ID",
                                                title:
                                                    "Notification",

                                                message:
                                                    "Hello",

                                                type:
                                                    "system"
                                            }
                                        }
                                    },

                                    rewardClawback: {
                                        summary:
                                            "Claw back reward",

                                        value: {
                                            action:
                                                "reward.clawback",

                                            data: {
                                                user: "USER_ID",
                                                amount: 1
                                            }
                                        }
                                    },

                                    rewardGrant: {
                                        summary:
                                            "Grant reward",

                                        value: {
                                            action:
                                                "reward.grant",

                                            data: {
                                                user: "USER_ID",
                                                amount: 1
                                            }
                                        }
                                    },

                                    systemPing: {
                                        summary:
                                            "System ping",

                                        value: {
                                            action:
                                                "system.ping",

                                            data: {}
                                        }
                                    },

                                    transactionCreate: {
                                        summary:
                                            "Create transaction",

                                        value: {
                                            action:
                                                "transaction.create",

                                            data: {
                                                user: "USER_ID",
                                                type: "credit",
                                                amount: 1
                                            }
                                        }
                                    },

                                    transactionFind: {
                                        summary:
                                            "Find transactions",

                                        value: {
                                            action:
                                                "transaction.find",

                                            data: {
                                                filter: {
                                                    user:
                                                        "USER_ID"
                                                }
                                            }
                                        }
                                    },

                                    transactionFindOne: {
                                        summary:
                                            "Find one transaction",

                                        value: {
                                            action:
                                                "transaction.findOne",

                                            data: {
                                                filter: {
                                                    user:
                                                        "USER_ID"
                                                }
                                            }
                                        }
                                    },

                                    userDelete: {
                                        summary:
                                            "Delete user",

                                        value: {
                                            action:
                                                "user.delete",

                                            data: {
                                                id:
                                                    "USER_ID"
                                            }
                                        }
                                    },

                                    userRoleUpdate: {
                                        summary:
                                            "Update user role",

                                        value: {
                                            action:
                                                "user.role_update",

                                            data: {
                                                user:
                                                    "USER_ID",

                                                role:
                                                    "ROLE_ID"
                                            }
                                        }
                                    },

                                    userStatusUpdate: {
                                        summary:
                                            "Update user status",

                                        value: {
                                            action:
                                                "user.status_update",

                                            data: {
                                                user:
                                                    "USER_ID",

                                                status:
                                                    "active"
                                            }
                                        }
                                    },

                                    userUnsuspend: {
                                        summary:
                                            "Unsuspend user",

                                        value: {
                                            action:
                                                "user.unsuspend",

                                            data: {
                                                user:
                                                    "USER_ID"
                                            }
                                        }
                                    },

                                    walletCredit: {
                                        summary:
                                            "Credit wallet",

                                        value: {
                                            action:
                                                "wallet.credit",

                                            data: {
                                                user:
                                                    "USER_ID",

                                                amount:
                                                    1
                                            }
                                        }
                                    },

                                    walletDebit: {
                                        summary:
                                            "Debit wallet",

                                        value: {
                                            action:
                                                "wallet.debit",

                                            data: {
                                                user:
                                                    "USER_ID",

                                                amount:
                                                    1
                                            }
                                        }
                                    },

                                    walletEnsure: {
                                        summary:
                                            "Ensure wallet",

                                        value: {
                                            action:
                                                "wallet.ensure",

                                            data: {
                                                user:
                                                    "USER_ID"
                                            }
                                        }
                                    },

                                    walletPendingAdjust: {
                                        summary:
                                            "Adjust pending wallet balance",

                                        value: {
                                            action:
                                                "wallet.pending_adjust",

                                            data: {
                                                user:
                                                    "USER_ID",

                                                amount:
                                                    1
                                            }
                                        }
                                    },

                                    walletView: {
                                        summary:
                                            "View wallet",

                                        value: {
                                            action:
                                                "wallet.view",

                                            data: {
                                                user:
                                                    "USER_ID"
                                            }
                                        }
                                    },

                                    withdrawalApprove: {
                                        summary:
                                            "Approve withdrawal",

                                        value: {
                                            action:
                                                "withdrawal.approve",

                                            data: {
                                                withdrawalId:
                                                    "WITHDRAWAL_ID"
                                            }
                                        }
                                    },

                                    withdrawalHold: {
                                        summary:
                                            "Hold withdrawal",

                                        value: {
                                            action:
                                                "withdrawal.hold",

                                            data: {
                                                withdrawalId:
                                                    "WITHDRAWAL_ID"
                                            }
                                        }
                                    },

                                    withdrawalReject: {
                                        summary:
                                            "Reject withdrawal",

                                        value: {
                                            action:
                                                "withdrawal.reject",

                                            data: {
                                                withdrawalId:
                                                    "WITHDRAWAL_ID"
                                            }
                                        }
                                    },

                                    withdrawalRequest: {
                                        summary:
                                            "Request withdrawal",

                                        value: {
                                            action:
                                                "withdrawal.request",

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

                        "401": {
                            description:
                                "Authentication failed",

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
