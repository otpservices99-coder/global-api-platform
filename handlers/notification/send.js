const Notification =
require("../../models/Notification");



module.exports = {

    name:"notification.send",


    execute:async(ctx)=>{


        const notification =
        await Notification.create({

            project:ctx.projectId,

            user:ctx.data.user || ctx.userId,

            title:
            ctx.data.title || "Notification",


            message:
            ctx.data.message || "",


            type:
            ctx.data.type || "system"

        });



        return {

            success:true,

            notification

        };


    }

};
