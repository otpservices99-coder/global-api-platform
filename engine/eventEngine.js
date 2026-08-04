const Event = require("../models/Event");
const Rule = require("../models/Rule");

const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");



class EventEngine {



    async process(eventData){


        const {
            project,
            user,
            event,
            data={}
        } = eventData;



        // Save event history

        const savedEvent = await Event.create({

            project,

            user,

            name:event,

            data

        });



        // Find active rules

        const rules = await Rule.find({

            project,

            trigger:event,

            status:"active"

        });



        for(const rule of rules){


            const passed = this.checkConditions(

                data,

                rule.conditions

            );


            if(!passed){

                continue;

            }



            await this.executeAction({

                project,

                user,

                action:rule.action,

                actionData:rule.actionData,

                event:savedEvent

            });



        }



        return savedEvent;


    }





    checkConditions(data,conditions){


        for(const key in conditions){


            const condition = conditions[key];


            const value = data[key];



            if(
                condition.$gte !== undefined &&
                value < condition.$gte
            ){

                return false;

            }



            if(
                condition.$lte !== undefined &&
                value > condition.$lte
            ){

                return false;

            }



            if(
                condition.$eq !== undefined &&
                value !== condition.$eq
            ){

                return false;

            }


        }


        return true;


    }







    async executeAction({

        project,

        user,

        action,

        actionData,

        event


    }){


        switch(action){



            case "wallet.credit":



                const amount =
                    Number(actionData.amount || 0);



                const wallet =
                    await Wallet.findOneAndUpdate(


                    {
                        project,
                        user
                    },


                    {

                        $inc:{

                            balance:amount,

                            totalEarned:amount

                        }

                    },


                    {
                        new:true,
                        upsert:true
                    }


                );



                await Transaction.create({

                    project,

                    user,

                    type:"earning",

                    amount,

                    description:
                    "Engine reward",

                    status:"completed"

                });



                return wallet;




            default:


                console.log(
                    "Unknown action:",
                    action
                );


        }


    }


}



module.exports = new EventEngine();
