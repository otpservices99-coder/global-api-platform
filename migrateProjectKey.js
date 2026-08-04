require("dotenv").config();

const mongoose = require("mongoose");
const Project = require("./models/Project");


const migrate = async()=>{

    try{

        await mongoose.connect(
            process.env.MONGODB_URI
        );


        const project = await Project.findOne({
            name:"Earnify"
        });


        if(!project){

            console.log("Project not found");
            process.exit();

        }


        const oldKey =
        "a7140bbdb69b89ba8a572947fbd7ceda44827cc532f696bd4367a65df2a648b5";


        const exists = project.apiKeys.find(
            k=>k.key === oldKey
        );


        if(!exists){

            project.apiKeys.push({

                key:oldKey,

                name:"production",

                status:"active"

            });


            await project.save();


            console.log(
                "✅ API key migrated successfully"
            );


        }else{

            console.log(
                "API key already exists"
            );

        }


        console.log(project.apiKeys);


        process.exit();



    }catch(error){

        console.log(error.message);

        process.exit(1);

    }

};


migrate();
