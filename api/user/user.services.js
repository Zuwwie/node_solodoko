const User = require("../../data/User");
const {getAllUsers} = require("./user.controller");

module.exports = {
    getAllUsers: async () => {
        const users = await User.find({});

        return users;
    },

    getSingleUserById: async (userId) => {
        const user = await User.findById(userId);

        console.log(user);

        if (!user) {
            throw new Error("404 User not found");
        }
        return user;
    },
    createUser: async (userObject) => {
        const user = await User.create(userObject);
        return user
    }
}