class Platform {

    constructor() {
        this.services = {};
    }

    register(name, service) {
        this.services[name] = service;
    }

    get(name) {

        if (!this.services[name]) {
            throw new Error(
                `Service '${name}' is not registered`
            );
        }

        return this.services[name];
    }

}

module.exports = new Platform();
