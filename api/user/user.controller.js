// const userServices = require('./user.services');
const {createUser, getAllUsers, deleteUserById} = require('./user.services');

module.exports = {
    getAllUsers: async (req, res, next) => {
        try {
            const users = await getAllUsers();

            res.json(users);
        } catch (e) {
            next(e);
        }
    },

    getUserById: async (req, res, next) => {
        try {
            const {user} = req;

            await res.json('Welcome id is User ' + user.name);
        } catch (e) {
            next(e);
        }
    },

    createUser: async (req, res, next) => {
        try {

            const createdUser = await createUser(req.body);

            res.json('Welcome new user ' + createdUser.name);

        } catch (e) {
            next(e);
        }

    },

    deleteUser: async (req, res, next) => {
        try {

            await deleteUserById(req.params.id);

            res.json('ok');
        } catch (e) {
            next(e);
        }
    }
};
