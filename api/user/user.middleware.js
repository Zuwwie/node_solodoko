const e = require("express");

const {getSingleUserById} = require("./user.services");

module.exports = {
    checkIsUserExists: async (req, res, next) => {
        try {
            const user = await getSingleUserById(req.params.id);

            if (!user) {
                throw new Error('User not found');
            }

            req.user = user;
            next()
        } catch (e) {
            next(e);
        }
    }
}

