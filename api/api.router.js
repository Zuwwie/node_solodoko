const apiRouter = require('express').Router();

const userRouter = require('./user/user.router');
const candyRouter = require('./candy/candy.router');
const packagingRouter = require('./packaging/packaging.router');

apiRouter.use('/users', userRouter);
apiRouter.use('/candy', candyRouter);
apiRouter.use('/packaging', packagingRouter);

module.exports = apiRouter;
