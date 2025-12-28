const orderRouter = require('express').Router();
const controller = require('./order.controller');

orderRouter.get('/', controller.getOrders);
orderRouter.post('/', controller.createOrder);

orderRouter.get('/:id', controller.getOrder);
orderRouter.delete('/:id', controller.deleteOrder);
orderRouter.patch('/:id', controller.updateOrder);

module.exports = orderRouter;
