const crypto = require("crypto");
const Project = require("../models/Project");


// CREATE PROJECT
const createProject = async (req, res) => {

    try {

        const {
            name,
            description,
            domains,
            allowedOrigins,
            settings
        } = req.body;


        const exists = await Project.findOne({
            name
        });


        if (exists) {
            return res.status(400).json({
                success: false,
                message: "Project already exists"
            });
        }


        const project = await Project.create({

            owner: req.user._id,

            name,

            description: description || "",

            domains: domains || [],

            allowedOrigins: allowedOrigins || [],

            apiKeys: [
                {
                    name: "production"
                }
            ],

            settings: settings || {}

        });


        res.json({

            success: true,

            message: "Project created successfully",

            data: project

        });


    } catch (error) {

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// GET ALL PROJECTS
const getProjects = async (req,res)=>{

    try {

        const projects = await Project.find()
        .populate(
            "owner",
            "username email role"
        );


        res.json({

            success:true,

            total:projects.length,

            data:projects

        });


    } catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// GET SINGLE PROJECT
const getProjectById = async(req,res)=>{

    try {

        const project = await Project.findById(
            req.params.id
        )
        .populate(
            "owner",
            "username email role"
        );


        if(!project){

            return res.status(404).json({

                success:false,

                message:"Project not found"

            });

        }


        res.json({

            success:true,

            data:project

        });


    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// UPDATE PROJECT
const updateProject = async(req,res)=>{

    try {

        const allowed = [

            "name",
            "description",
            "domains",
            "allowedOrigins",
            "settings",
            "status"

        ];


        const updates={};


        allowed.forEach(field=>{

            if(req.body[field] !== undefined){

                updates[field]=req.body[field];

            }

        });


        const project = await Project.findByIdAndUpdate(

            req.params.id,

            updates,

            {
                new:true
            }

        );


        if(!project){

            return res.status(404).json({

                success:false,

                message:"Project not found"

            });

        }


        res.json({

            success:true,

            message:"Project updated",

            data:project

        });


    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// CREATE API KEY
const createApiKey = async(req,res)=>{

    try {

        const project = await Project.findById(
            req.params.id
        );


        if(!project){

            return res.status(404).json({

                success:false,

                message:"Project not found"

            });

        }


        const apiKey = {

            key: crypto.randomBytes(32).toString("hex"),

            name:req.body.name || "default"

        };


        project.apiKeys.push(apiKey);


        await project.save();


        res.json({

            success:true,

            message:"API Key created",

            data:apiKey

        });


    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// REVOKE API KEY
const revokeApiKey = async(req,res)=>{

    try {

        const project = await Project.findById(
            req.params.id
        );


        if(!project){

            return res.status(404).json({

                success:false,

                message:"Project not found"

            });

        }


        const apiKey = project.apiKeys.id(
            req.params.keyId
        );


        if(!apiKey){

            return res.status(404).json({

                success:false,

                message:"API key not found"

            });

        }


        apiKey.status="revoked";


        await project.save();


        res.json({

            success:true,

            message:"API key revoked"

        });


    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};




// DELETE PROJECT
const deleteProject = async(req,res)=>{

    try {

        const project = await Project.findById(
            req.params.id
        );


        if(!project){

            return res.status(404).json({

                success:false,

                message:"Project not found"

            });

        }


        await Project.findByIdAndDelete(
            req.params.id
        );


        res.json({

            success:true,

            message:"Project deleted successfully",

            data:{
                id:project._id,
                name:project.name
            }

        });


    }catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



module.exports = {

    createProject,

    getProjects,

    getProjectById,

    updateProject,

    createApiKey,

    revokeApiKey,

    deleteProject

};
