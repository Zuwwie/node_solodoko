const userService = require("./user.controller");
const userServices = require('./user.services');
const {createUser, getSingleUserById, getAllUsers} = require("./user.services");

module.exports = {
    getAllUsers: async (req, res) => {
        try {
            const users = await getAllUsers();

            console.log(users);
            res.json(users);
        } catch (e) {
            res.status(404).json(e.message);
        }
    },

    getUserById: async (req, res) => {
        try {
            const {user} = req;

            res.json('Welcome id is User ' + user.name);
        } catch (e) {
            res.status(404).json(e.message);
        }
    },

    createUser: async (req, res) => {
        try {

            const createdUser = await createUser(req.body);

            console.log(createdUser);
            res.json('Welcome new user ' + createdUser.name);

        } catch (e) {
            res.status(404).json(e.message);
        }

    }
}