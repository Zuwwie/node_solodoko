const Candy = require('../../data/Candy');
const {getAllCandy, findCandyById, deleteCandyById, updateOneCandyById} = require('./candy.services');


module.exports = {

    getAllCandy: async (req, res, next) => {
        try {
            const candys = await getAllCandy();
            res.json(candys);
        } catch (e) {
            next(e);
        }
    },
    createCandy: async (req, res, next) => {
        try {
            const candy = await Candy.create(req.body);
            res.json(candy);
        } catch (e) {
            next(e);
        }
    },
    updateCandy: async (req, res, next) => {
        try {
            const candy = await updateOneCandyById(req.params.id, req.body);

            res.json(candy);
        } catch (e) {
            next(e);
        }
    },
    deleteCandy: async (req, res, next) => {
        try {
            const candy = await deleteCandyById(req.params.id);

            res.json('All Done');
        } catch (e) {
            next(e);
        }
    },

    findCandy: async (req, res, next) => {
        try {

            const candy = await findCandyById(req.params.id);

            res.json(candy);
        } catch (e) {
            next(e);
        }
    }

};
