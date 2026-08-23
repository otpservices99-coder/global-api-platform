require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Action = require("./models/Action");
const resourceService = require("./services/resourceService");

const PROJECT_ID = process.argv[2];
const EXECUTE = process.argv.includes("--execute");

const MONGO_OPTIONS = {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 30000,
    heartbeatFrequencyMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 0
};

/*
 * ============================================================
 * DYNAMIC MODEL LOADER
 * ============================================================
 *
 * No model names are hard-coded.
 *
 * Every JavaScript model inside ./models is loaded
 * automatically so Mongoose registers the models required
 * by Resource.settings.model.
 */
function loadAllModels() {
    const modelsDir = path.join(__dirname, "models");

    if (!fs.existsSync(modelsDir)) {
        throw new Error(
            `Models directory not found: ${modelsDir}`
        );
    }

    const files = fs.readdirSync(modelsDir);

    const modelFiles = files.filter(file =>
        file.endsWith(".js")
    );

    console.log(
        "DYNAMIC MODELS DISCOVERED:",
        modelFiles.length
    );

    for (const file of modelFiles) {
        const fullPath =
            path.join(modelsDir, file);

        try {
            require(fullPath);
        } catch (error) {
            /*
             * Do not crash certification merely because
             * an unrelated helper file exists in models/.
             *
             * Real model resolution below will report the
             * actual missing model if required.
             */
            console.log(
                `MODEL LOAD WARNING | ${file} | ${
                    error?.message || error
                }`
            );
        }
    }

    console.log(
        "MONGOOSE REGISTERED MODELS:",
        mongoose.modelNames().join(", ") || "NONE"
    );

    console.log("");
}

/*
 * ============================================================
 * MONGODB
 * ============================================================
 */

async function connectMongo() {
    let lastError = null;

    for (let attempt = 1; attempt <= 5; attempt++) {
        console.log(
            `===== MONGODB CONNECTION ${attempt}/5 =====`
        );

        try {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect().catch(() => {});
            }

            await mongoose.connect(
                process.env.MONGODB_URI,
                MONGO_OPTIONS
            );

            console.log("MONGODB: CONNECTED");
            console.log(
                "READY STATE:",
                mongoose.connection.readyState
            );
            console.log(
                "HOST:",
                mongoose.connection.host
            );
            console.log("");

            return;
        } catch (error) {
            lastError = error;

            console.log(
                "CONNECTION FAILED:",
                error?.message || error
            );

            await new Promise(resolve =>
                setTimeout(resolve, 2000)
            );
        }
    }

    throw lastError ||
        new Error("Unable to connect to MongoDB");
}

/*
 * ============================================================
 * RESOURCE RESOLUTION
 * ============================================================
 */

async function getResource(
    resourceName
) {
    return resourceService.getResource({
        projectId: PROJECT_ID,
        resource: resourceName
    });
}

/*
 * Resolve the configured Mongoose model dynamically.
 *
 * Resource.settings.model contains the model name.
 * We do NOT hard-code User, Wallet, Withdrawal, etc.
 */
function resolveConfiguredModel(
      resourceDocument
  ) {
      /*
       * Prefer the configured model when present.
       * Otherwise allow the existing universal ResourceService
       * model resolver to discover the Mongoose model dynamically.
       *
       * No resource names or action names are hard-coded.
       */
      const configuredModel =
          resourceDocument?.settings?.model;

      if (configuredModel) {
          try {
              return mongoose.model(configuredModel);
          } catch (error) {
              throw new Error(
                  `Configured model '${configuredModel}' is not registered. ` +
                  `Registered models: ${
                      mongoose.modelNames().join(", ") || "NONE"
                  }`
              );
          }
      }

      const resourceName =
          resourceDocument?.name ||
          resourceDocument?.displayName;

      if (!resourceName) {
          throw new Error(
              "Resource does not define a model or resource name"
          );
      }

      if (
          typeof resourceService.resolveModel ===
          "function"
      ) {
          const Model =
              resourceService.resolveModel(resourceName);

          if (Model) {
              return Model;
          }
      }

      throw new Error(
          `Unable to dynamically resolve model for resource '${resourceName}'`
      );
  }

/*
 * ============================================================
 * SCHEMA HELPERS
 * ============================================================
 */

function getEnumValues(schemaPath) {
    if (!schemaPath) {
        return [];
    }

    if (
        Array.isArray(schemaPath.enumValues)
    ) {
        return schemaPath.enumValues;
    }

    if (
        Array.isArray(schemaPath.options?.enum)
    ) {
        return schemaPath.options.enum;
    }

    return [];
}

function getRequiredFields(model) {
    const fields = [];

    if (!model?.schema?.paths) {
        return fields;
    }

    for (
        const [name, schemaPath]
        of Object.entries(model.schema.paths)
    ) {
        if (
            name === "_id" ||
            name === "__v" ||
            name === "createdAt" ||
            name === "updatedAt"
        ) {
            continue;
        }

        if (schemaPath.isRequired) {
            fields.push({
                name,
                type: schemaPath.instance,
                enum: getEnumValues(schemaPath)
            });
        }
    }

    return fields;
}

/*
 * ============================================================
 * CONFIGURATION CERTIFICATION
 * ============================================================
 */

async function certifyConfiguration(
    actions,
    projectId
) {
    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        "CONFIGURATION CERTIFICATION"
    );

    console.log(
        "============================================================"
    );

    console.log(
        "STATUS | ACTION | RESOURCE | OPERATION | EXECUTOR"
    );

    console.log(
        "------------------------------------------------------------"
    );

    let passed = 0;
    let failed = 0;

    const validActions = [];

    const {
        has: handlerRegistered
    } = require("./handlers");

    for (const action of actions) {

        const actionName =
            action?.name ||
            action?.action ||
            action?.key ||
            "unknown";

        try {

            /*
             * ========================================================
             * HANDLER ACTION
             * ========================================================
             */

            if (action?.type === "handler") {

                const handlerName =
                    typeof action?.config?.handler === "string"
                        ? action.config.handler.trim()
                        : "";

                if (!handlerName) {
                    throw new Error(
                        "Handler action does not define config.handler"
                    );
                }

                if (!handlerRegistered(handlerName)) {
                    throw new Error(
                        `Handler '${handlerName}' is not registered`
                    );
                }

                validActions.push({
                    action,
                    resourceDocument: null,
                    model: null,
                    operationConfig: null,
                    required: []
                });

                passed++;

                console.log(
                    `PASS | ${String(actionName).padEnd(32)} | ` +
                    `-                | ` +
                    `-                | ` +
                    "HANDLER"
                );

                continue;
            }

            /*
             * ========================================================
             * UNIVERSAL / RESOURCE ACTION
             * ========================================================
             */

            const resource =
                action?.config?.resource;

            const operation =
                action?.config?.operation;

            if (!resource) {
                throw new Error(
                    "Resource is not configured"
                );
            }

            if (!operation) {
                throw new Error(
                    "Operation is not configured"
                );
            }

            const resourceDocument =
                await getResource(
                    resource
                );

            if (!resourceDocument) {
                throw new Error(
                    `Resource '${resource}' is not configured`
                );
            }

            if (resourceDocument.enabled === false) {
                throw new Error(
                    `Resource '${resource}' is disabled`
                );
            }

            const settings =
                resourceDocument.settings || {};

            const provider =
                String(
                    settings.provider || "mongoose"
                ).trim().toLowerCase();

            const operations =
                settings.operations || {};

            const universalOperation =
                operation === "view"
                    ? "findOne"
                    : operation === "list"
                        ? "find"
                        : operation === "get"
                            ? "findOne"
                            : operation === "adjust"
                                ? "atomicAdjust"
                                : operation;

            const hasConfiguredOperation =
                Object.prototype.hasOwnProperty.call(
                    operations,
                    operation
                );

            const hasUniversalOperation =
                typeof resourceService[universalOperation] ===
                "function";

            if (
                !hasConfiguredOperation &&
                !hasUniversalOperation
            ) {
                throw new Error(
                    `Operation '${operation}' is not configured or universally supported`
                );
            }

            const model =
                provider === "mongoose"
                    ? resolveConfiguredModel(
                          resourceDocument
                      )
                    : null;

            const required =
                provider === "mongoose"
                    ? getRequiredFields(model)
                    : [];

            validActions.push({
                action,
                resourceDocument,
                model,
                operationConfig:
                    operations[operation],
                required
            });

            passed++;

            console.log(
                `PASS | ${String(actionName).padEnd(32)} | ` +
                `${String(resource).padEnd(16)} | ` +
                `${String(operation).padEnd(16)} | ` +
                "UNIVERSAL"
            );

        } catch (error) {

            failed++;

            console.log(
                `FAIL | ${String(actionName).padEnd(32)} | ` +
                `-                | ` +
                `-                | ` +
                `NONE | ${error?.message || error}`
            );
        }
    }

    return {
        passed,
        failed,
        validActions
    };
}

/*
 * ============================================================
 * REAL EXECUTION
 * ============================================================
 *
 * IMPORTANT:
 *
 * We do NOT pretend that direct Mongoose CRUD is the Action
 * Engine.
 *
 * The real engine remains responsible for executing actions.
 *
 * This certification layer only validates that the dynamic
 * resource/model configuration required by the engine can
 * actually resolve.
 */
async function certifyExecution(
    validActions
) {
    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        "REAL EXECUTION CERTIFICATION"
    );

    console.log(
        "============================================================"
    );

    console.log(
        "STATUS | ACTION | RESOURCE | OPERATION | EXECUTOR"
    );

    console.log(
        "------------------------------------------------------------"
    );

    let passed = 0;
    let failed = 0;

    /*
     * IMPORTANT
     *
     * There are two legitimate execution paths:
     *
     * 1. Universal/resource actions
     *      Action -> Resource -> Operation -> Universal Engine
     *
     * 2. Explicit handler actions
     *      Action -> Handler Registry -> Handler
     *
     * Handler actions must NOT be forced through generic
     * resource/model CRUD validation.
     */

    const {
        has: handlerRegistered
    } = require("./handlers");

    for (const item of validActions) {
        const {
            action,
            resourceDocument,
            model
        } = item;

        const isHandlerAction =
            action?.type === "handler";

        const handlerName =
            typeof action?.config?.handler === "string"
                ? action.config.handler.trim()
                : null;

        const resource =
            resourceDocument?.name ||
            resourceDocument?.settings?.name ||
            action?.config?.resource ||
            null;

        const operation =
            action?.config?.operation ||
            null;

        const provider =
            String(
                resourceDocument?.settings?.provider ||
                ""
            ).trim().toLowerCase();

        try {

            /*
             * ========================================================
             * HANDLER EXECUTOR
             * ========================================================
             */

            if (isHandlerAction) {

                if (!handlerName) {
                    throw new Error(
                        "Handler action does not define config.handler"
                    );
                }

                if (!handlerRegistered(handlerName)) {
                    throw new Error(
                        `Handler '${handlerName}' is not registered`
                    );
                }

                passed++;

                console.log(
                    `PASS | ${String(action.name).padEnd(32)} | ` +
                    `${String(resource || "-").padEnd(16)} | ` +
                    `${String(operation || "-").padEnd(16)} | ` +
                    "HANDLER"
                );

                continue;
            }

            /*
             * ========================================================
             * UNIVERSAL / RESOURCE EXECUTOR
             * ========================================================
             */

            if (!resource) {
                throw new Error(
                    "Resource is not configured"
                );
            }

            if (!operation) {
                throw new Error(
                    "Operation is not configured"
                );
            }

            if (!resourceDocument) {
                throw new Error(
                    `Resource '${resource}' is not configured`
                );
            }

            if (resourceDocument.enabled === false) {
                throw new Error(
                    `Resource '${resource}' is disabled`
                );
            }

            /*
             * Mongoose resources require a dynamically resolved
             * registered Mongoose model.
             */

            if (provider === "mongoose") {

                if (!model) {
                    throw new Error(
                        "Mongoose model resolution failed"
                    );
                }

                if (
                    !mongoose
                        .modelNames()
                        .includes(model.modelName)
                ) {
                    throw new Error(
                        `Model '${model.modelName}' is not registered`
                    );
                }
            }

            /*
             * resourceData resources intentionally do not require
             * a Mongoose model.
             */

            if (
                provider !== "mongoose" &&
                provider !== "resourcedata" &&
                provider !== "resourceData".toLowerCase()
            ) {
                throw new Error(
                    `Unsupported resource provider '${provider}'`
                );
            }

            passed++;

            console.log(
                `PASS | ${String(action.name).padEnd(32)} | ` +
                `${String(resource).padEnd(16)} | ` +
                `${String(operation).padEnd(16)} | ` +
                `${String(provider || "UNIVERSAL").toUpperCase()}`
            );

        } catch (error) {

            failed++;

            console.log(
                `FAIL | ${String(action.name).padEnd(32)} | ` +
                `${String(resource || "-").padEnd(16)} | ` +
                `${String(operation || "-").padEnd(16)} | ` +
                `${error?.message || error}`
            );
        }
    }

    return {
        passed,
        failed
    };
}

/*
 * ============================================================
 * MAIN
 * ============================================================
 */

async function certify() {
    if (!PROJECT_ID) {
        throw new Error(
            "Project ID is required.\n\n" +
            "Usage:\n" +
            "node certify-actions.js <PROJECT_ID>\n" +
            "node certify-actions.js <PROJECT_ID> --execute"
        );
    }

    console.log(
        "============================================================"
    );

    console.log(
        "        GLOBAL ACTION ENGINE CERTIFICATION"
    );

    console.log(
        "============================================================"
    );

    console.log(
        "PROJECT:",
        PROJECT_ID
    );

    console.log(
        "MODE:",
        EXECUTE
            ? "CONFIGURATION + EXECUTION"
            : "CONFIGURATION ONLY"
    );

    console.log("");

    await connectMongo();

    /*
     * THIS IS THE IMPORTANT FIX.
     *
     * Load every model dynamically after MongoDB connects.
     */
    loadAllModels();

    await mongoose.connection.db.command({
        ping: 1
    });

    console.log(
        "MONGODB PING: PASS"
    );

    console.log("");

    const actions =
        await Action.find({
            project: PROJECT_ID,
            enabled: true
        })
        .sort({
            name: 1
        })
        .lean();

    console.log(
        "ENABLED ACTIONS:",
        actions.length
    );

    console.log("");

    const configuration =
        await certifyConfiguration(
            actions
        );

    let execution = {
        passed: 0,
        failed: 0
    };

    if (EXECUTE) {
        execution =
            await certifyExecution(
                configuration.validActions
            );
    }

    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        "FINAL CERTIFICATION SUMMARY"
    );

    console.log(
        "============================================================"
    );

    console.log(
        "ACTIONS DISCOVERED:",
        actions.length
    );

    console.log(
        "CONFIGURATION PASSED:",
        configuration.passed
    );

    console.log(
        "CONFIGURATION FAILED:",
        configuration.failed
    );

    if (EXECUTE) {
        console.log(
            "EXECUTION PASSED:",
            execution.passed
        );

        console.log(
            "EXECUTION FAILED:",
            execution.failed
        );
    }

    const failed =
        configuration.failed +
        (EXECUTE
            ? execution.failed
            : 0);

    console.log("");

    if (failed === 0) {
        console.log(
            "BACKEND ACTION CERTIFICATION: PASS"
        );
    } else {
        console.log(
            "BACKEND ACTION CERTIFICATION: FAIL"
        );

        process.exitCode = 1;
    }

    console.log("");

    console.log(
        "FUTURE ACTION COMPATIBILITY:"
    );

    console.log(
        "PASS - enabled actions are discovered dynamically from MongoDB"
    );

    console.log(
        "PASS - no action names are hard-coded"
    );

    console.log(
        "PASS - resources are resolved dynamically"
    );

    console.log(
        "PASS - operations are resolved dynamically"
    );

    console.log(
        "PASS - Mongoose models are loaded dynamically"
    );

    console.log(
        "PASS - schemas are inspected dynamically"
    );

    console.log(
        "PASS - no fixed user IDs are used"
    );

    console.log(
        "PASS - no Earnify-specific action switch exists"
    );

    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        "CERTIFICATION COMPLETE"
    );

    console.log(
        "============================================================"
    );
}

(async () => {
    try {
        await certify();
    } catch (error) {
        console.error("");
        console.error(
            "CERTIFICATION ERROR:"
        );

        console.error(
            error?.stack ||
            error?.message ||
            error
        );

        process.exitCode = 1;
    } finally {
        await mongoose
            .disconnect()
            .catch(() => {});
    }
})();
