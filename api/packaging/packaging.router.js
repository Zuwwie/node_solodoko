const {getAllPackaging, postPackaging, deletePackaging, updatePackaging} = require('./packaging.controller');
const packagingRouter = require('express').Router();

packagingRouter.get('/', getAllPackaging);
packagingRouter.post('/', postPackaging);

packagingRouter.delete('/:id', deletePackaging );
packagingRouter.patch('/:id', updatePackaging );

module.exports = packagingRouter;
