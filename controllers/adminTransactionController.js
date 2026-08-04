const Transaction = require("../models/Transaction");



const getTransactions = async(req,res)=>{

    try{


        const {

            type,

            user,

            page = 1,

            limit = 20

        } = req.query;



        const filter = {

            project:req.project._id

        };



        if(type){

            filter.type = type;

        }



        if(user){

            filter.user = user;

        }



        const skip = 
            (Number(page)-1) * Number(limit);



        const transactions = await Transaction.find(filter)

        .populate(
            "user",
            "username email"
        )

        .sort({
            createdAt:-1
        })

        .skip(skip)

        .limit(Number(limit));



        const total = await Transaction.countDocuments(
            filter
        );



        res.json({

            success:true,

            total,

            page:Number(page),

            pages:Math.ceil(
                total / Number(limit)
            ),

            data:transactions

        });



    }catch(error){


        res.status(500).json({

            success:false,

            message:error.message

        });


    }


};





module.exports = {

    getTransactions

};
