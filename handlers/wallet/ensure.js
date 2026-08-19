const walletService = require("../../services/walletService");

module.exports = {

    name: "wallet.ensure",

    execute: async (ctx) => {

        const userId =
            ctx?.data?.user ||
            ctx?.data?.userId ||
            ctx?.userId ||
            ctx?.event?.entityId;

        if (!userId) {
            return {
                success: false,
                message: "User ID missing for wallet.ensure"
            };
        }

        if (!ctx?.projectId) {
            return {
                success: false,
                message: "Project ID missing for wallet.ensure"
            };
        }

        const wallet =
            await walletService.ensureWallet(
                ctx.projectId,
                userId,
                {
                    currency:
                        ctx?.data?.currency ||
                        "NGN",

                    metadata:
                        ctx?.data?.metadata || {}
                }
            );

        return {
            success: true,
            wallet
        };
    }
};
