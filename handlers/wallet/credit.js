const platform =
    require("../../services/platformService");

module.exports = {

    name: "wallet.credit",

    execute: async (ctx) => {

        const data =
            ctx?.data || {};

        /*
         * IMPORTANT:
         * For engine/admin calls, data.user is the
         * wallet owner. Never let ctx.userId override it.
         *
         * userId is retained only as a fallback for
         * self-service calls where data.user is absent.
         */
        const userId =
            data.user ||
            data.userId ||
            ctx?.userId ||
            ctx?.event?.entityId;

        if (!userId) {
            return {
                success: false,
                message:
                    "User ID missing for wallet.credit"
            };
        }

        const amount =
            Number(data.amount);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return {
                success: false,
                message:
                    "A positive amount is required for wallet.credit"
            };
        }

        if (!ctx?.projectId) {
            return {
                success: false,
                message:
                    "Project ID is required for wallet.credit"
            };
        }

        try {

            const wallet =
                await platform.addBalance(
                    ctx.projectId,
                    userId,
                    amount,
                    data.description ||
                    "Wallet Credit"
                );

            return {
                success: true,
                wallet
            };

        } catch (error) {

            return {
                success: false,
                message: error.message
            };
        }
    }
};
