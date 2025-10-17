
class ApiError extends Error {

    constructor(message, statusCode) {
        super(message);
        this.status = statusCode;
        this.statusCode = statusCode;
    }
}

module.exports = ApiError;