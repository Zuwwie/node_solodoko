const ApiError = require('../../errors/ApiError');
const User = require('../../data/User');

module.exports = {
    getAllUsers: async () => {
        const users = await User.find({});

        return users;
    },

    getSingleUserById: async (userId) => {
        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError('User not found', 404);
        }
        return user;
    },
    createUser: async (userObject) => {
        const user = await User.create(userObject);
        return user;
    }
};
