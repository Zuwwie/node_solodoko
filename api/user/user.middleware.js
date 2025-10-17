const ApiError = require("../../errors/ApiError");

const {getSingleUserById} = require("./user.services");

module.exports = {
    checkIsUserExists: async (req, res, next) => {
        try {
            const user = await getSingleUserById(req.params.id);

            if (!user) {
                console.log(333)
                throw new ApiError('User not found', 404);
            }

            req.user = user;
            next()
        } catch (e) {
            next(e);
        }
    }
}

