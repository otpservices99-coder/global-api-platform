const platform =
    require("../../services/platformService");


module.exports = {

    name: "wallet.debit",

    execute: async (ctx) => {

        const userId =
            ctx?.userId ||
            ctx?.data?.user ||
            ctx?.data?.userId ||
            ctx?.event?.entityId;

        if (!userId) {

            return {
                success: false,
                message:
                    "User ID missing for wallet.debit"
            };
        }

        const amount =
            Number(ctx?.data?.amount);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            return {
                success: false,
                message:
                    "A positive amount is required for wallet.debit"
            };
        }

        if (!ctx?.projectId) {

            return {
                success: false,
                message:
                    "Project ID is required for wallet.debit"
            };
        }

        try {

            const wallet =
                await platform.removeBalance(
                    ctx.projectId,
                    userId,
                    amount,
                    ctx?.data?.description ||
                    "Wallet Debit"
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
