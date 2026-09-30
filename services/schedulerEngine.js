const pluginEngine = require("./pluginEngine");

async function runJobs() {
    if (globalThis.__CLOUDFLARE_WORKER__) {
        return;
    }

    // Load Mongoose Job model only outside Cloudflare Workers.
    const Job = require("../models/Job");

    const now = new Date();

    const jobs = await Job.find({
        enabled: true,
        nextRun: { $lte: now }
    });

    for (const job of jobs) {
        try {
            await pluginEngine.execute(
                { event: { project: job.project } },
                job.action
            );

            job.lastRun = new Date();

            if (job.type === "once") {
                job.enabled = false;
            }

            await job.save();
        } catch (error) {
            console.log("Job failed:", error.message);
        }
    }
}

if (!globalThis.__CLOUDFLARE_WORKER__) {
    setInterval(runJobs, 60000);
}

module.exports = {
    runJobs
};
