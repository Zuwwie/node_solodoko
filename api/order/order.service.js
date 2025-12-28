const Order = require('../../data/Order');


module.exports = {
    getAllOrders: async () => {
        const orders = await Order.find({}).sort({createdAt: -1});
        console.log(orders);
        return orders;
    },
    createNewOrder: async (newOrderData) => {
        const newOrder = await Order.create(newOrderData);
        return newOrder;
    },
    updateOrderId: async (id, newOrderData) => {
        const updOrder = await Order.findByIdAndUpdate(id, newOrderData);
        return updOrder;
    },
    deleteOrderById: async (id) => {
        await Order.findByIdAndDelete(id);
        return 'ok';
    },
    getOrderById: async (id) => {
        const order = await Order.findById(id);
        return order;
    }


};
