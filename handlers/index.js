const registry = new Map();

function register(name, handler) {
    if (!name || typeof handler !== "function") {
        throw new Error("Handler name and function are required");
    }

    registry.set(String(name), handler);
}

function loadHandlers() {
    const handlerModules = [
        require("./wallet/credit"),
        require("./wallet/debit"),
        require("./wallet/ensure"),

        require("./user/statusUpdate"),
        require("./user/roleUpdate"),
        require("./user/unsuspend"),

        require("./withdrawal/approve"),
        require("./withdrawal/reject"),
        require("./withdrawal/request"),

        require("./notification/send")
    ];

    for (const handler of handlerModules) {
        if (
            handler &&
            handler.name &&
            typeof handler.execute === "function"
        ) {
            register(handler.name, handler.execute);
        }
    }
}

function has(name) {
    if (!name) {
        return false;
    }

    return registry.has(String(name));
}

async function execute(name, context = {}) {
    if (!name) {
        throw new Error("Handler name is required");
    }

    const handler = registry.get(String(name));

    if (!handler) {
        throw new Error(`Handler not found: ${name}`);
    }

    return handler(context);
}

loadHandlers();

module.exports = {
    register,
    loadHandlers,
    has,
    execute,
    registry
};
