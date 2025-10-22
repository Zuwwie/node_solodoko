const {getAllPackaging, createPackaging, deletePackagingById, updatePackagingById} = require('./packaging.service');

module.exports = {
    getAllPackaging: async (req, res, next) => {
        try {
            const packaging = await getAllPackaging();
            res.json(packaging);
        } catch (e) {
            next(e);
        }
    },

    postPackaging: async (req, res, next) => {
        try {
            const newPackaging = await createPackaging(req.body);
            res.json(newPackaging);
        } catch (e) {
            next(e);
        }
    },

    deletePackaging: async (req, res, next) => {
        try {
            const {id} = req.params;

            await deletePackagingById(id);
            res.json('ok');
        } catch (e) {
            next(e);
        }
    },

    updatePackaging: async (req, res, next) => {
        try {
            const {id} = req.params;
            const newData = req.body;

            const packaging = await updatePackagingById(id, newData);

            res.json(packaging);
        } catch (e) {
            next(e);
        }
    }

};
