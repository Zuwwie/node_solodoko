const candyRouter = require('express').Router();
const controller = require('./candy.controller');


candyRouter.get('/', controller.getAllCandy);
candyRouter.post('/', controller.createCandy);

candyRouter.get('/:id', controller.findCandy);
candyRouter.delete('/:id', controller.deleteCandy);
candyRouter.patch('/:id', controller.updateCandy);

module.exports = candyRouter;
