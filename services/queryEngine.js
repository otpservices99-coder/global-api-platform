const buildQuery = (queryParams)=>{

const query={};


for(const key in queryParams){


if(
[
"page",
"limit",
"sort",
"search",
"select"
].includes(key)
){

continue;

}


query[key]=queryParams[key];


}


return query;

};



const buildOptions=(queryParams)=>{


const options={};


if(queryParams.page){

options.page=
Number(queryParams.page);

}


if(queryParams.limit){

options.limit=
Number(queryParams.limit);

}


if(queryParams.sort){

options.sort=
queryParams.sort;

}


if(queryParams.select){

options.select=
queryParams.select
.split(",");

}


return options;

};



module.exports={

buildQuery,

buildOptions

};
