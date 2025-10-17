const userRouter = require('express').Router();

const controller = require('./user.controller');
const middleware = require('./user.middleware');

userRouter.get('/', controller.getAllUsers);

userRouter.get('/:id', middleware.checkIsUserExists, controller.getUserById);

userRouter.post('/', controller.createUser);

module.exports = userRouter;