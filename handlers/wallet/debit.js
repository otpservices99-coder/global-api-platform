const platform = require("../../services/platformService");

module.exports = {
    name: "wallet.debit",

    execute: async (ctx) => {

        const wallet = await platform.removeBalance(
            ctx.projectId,
            ctx.userId,
            Number(ctx.data.amount),
            ctx.data.description || "Wallet Debit"
        );

        return {
            success: true,
            wallet
        };

    }
};
