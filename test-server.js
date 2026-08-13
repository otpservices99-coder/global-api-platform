const http = require("http");

const options = {
    hostname: "127.0.0.1",
    port: 3000,
    path: "/",
    method: "GET",
    headers: {
        "Accept": "application/json"
    }
};

const req = http.request(options, (res) => {

    console.log("STATUS:", res.statusCode);
    console.log("HEADERS:", res.headers);

    let body = "";

    res.on("data", (chunk) => {
        body += chunk;
    });

    res.on("end", () => {
        console.log("\nRESPONSE:");
        console.log(body);

        if (res.statusCode >= 200 && res.statusCode < 400) {
            console.log("\n✅ SERVER TEST PASSED");
        } else {
            console.log("\n❌ SERVER RESPONDED WITH ERROR");
        }
    });

});

req.on("error", (error) => {
    console.error("\n❌ SERVER TEST FAILED");
    console.error(error.message);
});

req.end();
