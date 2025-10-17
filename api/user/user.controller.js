const userService = require("./user.controller");
const userServices = require('./user.services');
const {createUser, getSingleUserById, getAllUsers} = require("./user.services");

module.exports = {
    getAllUsers: async (req, res, next) => {
        try {
            const users = await getAllUsers();

            console.log(users);
            res.json(users);
        } catch (e) {
            next(e);
        }
    },

    getUserById: async (req, res, next) => {
        try {
            const {user} = req;

            res.json('Welcome id is User ' + user.name);
        } catch (e) {
            next(e);
        }
    },

    createUser: async (req, res, next) => {
        try {

            const createdUser = await createUser(req.body);

            console.log(createdUser);
            res.json('Welcome new user ' + createdUser.name);

        } catch (e) {
            next(e);
        }

    }
}