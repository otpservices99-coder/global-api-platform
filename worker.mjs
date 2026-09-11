import { handleAsNodeRequest } from "cloudflare:node";

globalThis.__CLOUDFLARE_WORKER__ = true;

let serverPromise = null;

async function ensureServer() {
    if (!serverPromise) {
        serverPromise = import("./server.js")
            .then(({ default: app }) => {
                app.listen(3000);
                return app;
            })
            .catch((error) => {
                serverPromise = null;
                throw error;
            });
    }

    return serverPromise;
}

export default {
    async fetch(request) {
        await ensureServer();
        return handleAsNodeRequest(3000, request);
    }
};
