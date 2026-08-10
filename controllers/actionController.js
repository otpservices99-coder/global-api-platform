const {
    list
} = require("../handlers");



const getHandlers = async(req,res)=>{

    try{


        res.json({

            success:true,

            data:list()

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }

};




module.exports = {

    getHandlers

};
