const Setting = require("../models/Setting");


// Get project settings
const getSettings = async (req,res)=>{

    try{

        let settings = await Setting.findOne({
            project:req.project._id
        });


        if(!settings){

            settings = await Setting.create({
                project:req.project._id
            });

        }


        res.json({

            success:true,

            data:settings

        });


    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// Update project settings
const updateSettings = async(req,res)=>{

    try{


        let settings = await Setting.findOne({

            project:req.project._id

        });



        if(!settings){

            settings = new Setting({

                project:req.project._id

            });

        }



        const allowed = [

            "currency",
            "minimumWithdrawal",
            "referralBonus",
            "dailyBonus",
            "rewardedVideoReward",
            "siteName",
            "logo",
            "maintenance"

        ];



        allowed.forEach(key=>{

            if(req.body[key] !== undefined){

                settings[key] = req.body[key];

            }

        });



        await settings.save();



        res.json({

            success:true,

            message:"Settings updated",

            data:settings

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });

    }


};



module.exports={

    getSettings,

    updateSettings

};
