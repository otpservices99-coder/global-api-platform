import { httpServerHandler } from "cloudflare:node";

globalThis.__CLOUDFLARE_WORKER__ = true;

const { default: app } = await import("./server.js");

app.listen(3000);

export default httpServerHandler({ port: 3000 });
