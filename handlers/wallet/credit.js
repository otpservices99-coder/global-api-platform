const platform = require("../../services/platformService");


module.exports = {

    name: "wallet.credit",


    execute: async (ctx) => {


        const userId =
            ctx.userId ||
            ctx.data.user ||
            ctx.event?.entityId;


        if (!userId) {

            return {

                success:false,

                message:"User ID missing for wallet.credit"

            };

        }



        const wallet =
            await platform.addBalance(

                ctx.projectId,

                userId,

                Number(ctx.data.amount),

                ctx.data.description || "Wallet Credit"

            );



        return {

            success:true,

            wallet

        };


    }

};
