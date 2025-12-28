// const Order = require('../../data/Order');
const service = require('./order.service');


module.exports = {
    getOrders: async (req, res, next) => {
        try {
            const orders = await service.getAllOrders();

            res.json(orders);
        } catch (e) {
            next(e);
        }
    },
    createOrder: async (req, res, next) => {
        try {
            const newOrderData = req.body;
            const newOrder = await service.createNewOrder(newOrderData);
            res.json(newOrder);
        } catch (e) {
            next(e);
        }
    },
    updateOrder: async (req, res, next) => {
        try {
            const {id} = req.params;

            const updOrder = await service.updateOrderId(id, req.body);

            res.json(updOrder);
        } catch (e) {
            next(e);
        }
    },
    getOrder: async (req, res, next) => {
        try {
            const {id} = req.params;

            const order = await service.getOrderById(id);

            res.json(order);
        } catch (e) {
            next(e);
        }
    },
    deleteOrder: async (req, res, next) => {
        try {
            const {id} = req.params;

            await service.deleteOrderById(id);

            res.json('ok');
        } catch (e) {
            next(e);
        }
    }
};
