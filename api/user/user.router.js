const userRouter = require('express').Router();

const controller = require('./user.controller');
const middleware = require('./user.middleware');

userRouter.get('/', controller.getAllUsers);
userRouter.post('/', controller.createUser);

userRouter.get('/:id', middleware.checkIsUserExists, controller.getUserById);
userRouter.delete('/:id', middleware.checkIsUserExists, controller.deleteUser );

module.exports = userRouter;
