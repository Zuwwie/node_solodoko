const Packaging = require('../../data/Packaging');


module.exports = {

    getAllPackaging: async () => {
        const pack = await Packaging.find({});
        return pack;
    },

    createPackaging: async (packBody) => {
        const packaging = await Packaging.create(packBody);
        return packaging;
    },
    updatePackagingById: async (id, newData) => {
        const pack = await Packaging.findByIdAndUpdate(id, newData, {new: true});
        return pack;
    },
    deletePackagingById: async (id) => {
        await Packaging.findByIdAndDelete(id);
        return 'done';
    },
};
