const apiRouter = require('express').Router();

const userRouter = require('./user/user.router');
const candyRouter = require('./candy/candy.router');
const packagingRouter = require('./packaging/packaging.router');
const orderRouter = require('./order/order.router');

apiRouter.use('/users', userRouter);
apiRouter.use('/candy', candyRouter);
apiRouter.use('/packaging', packagingRouter);
apiRouter.use('/orders', orderRouter);

module.exports = apiRouter;
