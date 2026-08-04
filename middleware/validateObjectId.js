const mongoose = require("mongoose");


module.exports = function(param){

    return function(req,res,next){

        const id = req.params[param];


        if(!mongoose.Types.ObjectId.isValid(id)){

            return res.status(400).json({

                success:false,

                message:`Invalid ${param}`

            });

        }


        next();

    };

};
