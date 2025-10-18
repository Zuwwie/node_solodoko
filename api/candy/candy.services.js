const Candy = require('../../data/Candy');

module.exports = {

    getAllCandy() {
        const candys = Candy.find({});
        return candys;
    },

    findCandyById(id) {
        const candy = Candy.findById(id);
        return candy;
    },

    deleteCandyById(id) {
        const candy = Candy.findByIdAndDelete(id);
        return candy;
    },

    updateOneCandyById(id, updateData) {
        const candy = Candy.findByIdAndUpdate(id, updateData, {new: true});
        console.log(candy);
        return candy;
    }

};
