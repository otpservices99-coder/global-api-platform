const API = (() => {

    const BASE_URL = "http://localhost:3000";

    function token() {
        return localStorage.getItem("token") || "";
    }

    function apiKey() {
        return localStorage.getItem("apiKey") || "";
    }

    function headers(extra = {}) {

        return {

            "Content-Type":"application/json",

            ...(token() && {
                Authorization:`Bearer ${token()}`
            }),

            ...(apiKey() && {
                "X-API-Key":apiKey()
            }),

            ...extra

        };

    }

    async function request(method,url,data){

        const response = await fetch(

            BASE_URL + url,

            {

                method,

                headers:headers(),

                body:data ? JSON.stringify(data) : undefined

            }

        );

        const json = await response.json();

        if(!response.ok){

            throw json;

        }

        return json;

    }

    return {

        get(url){

            return request("GET",url);

        },

        post(url,data){

            return request("POST",url,data);

        },

        put(url,data){

            return request("PUT",url,data);

        },

        patch(url,data){

            return request("PATCH",url,data);

        },

        delete(url){

            return request("DELETE",url);

        },

        saveToken(token){

            localStorage.setItem("token",token);

        },

        saveApiKey(key){

            localStorage.setItem("apiKey",key);

        },

        logout(){

            localStorage.removeItem("token");
            localStorage.removeItem("apiKey");

        }

    };

})();
