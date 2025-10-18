const apiRouter = require('express').Router();

const userRouter = require('./user/user.router');
const candyRouter = require('./candy/candy.router');

apiRouter.use('/users', userRouter);
apiRouter.use('/candy', candyRouter);

module.exports = apiRouter;
