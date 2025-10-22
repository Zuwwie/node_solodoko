const {Schema, model} = require('mongoose');

const PackagingSchema = new Schema(
    {
        key: {type: String, required: true, unique: true, trim: true},
        name: {type: String, required: true, trim: true},
        priceSell: {type: Number, required: true, min: 0},
        priceBuy: {type: Number, default: 0, min: 0},
        capacityG: {type: Number, required: true, min: 1},
        isAvailable: {type: Boolean, default: true, index: true},
        imageKey: {type: String, trim: true},
        category: {type: String, trim: true},
    },
    {timestamps: true, versionKey: false}
);

PackagingSchema.pre('validate', function(next) {
    if (!this.imageKey) {
        this.imageKey = this.key;
    }
    next();
});

module.exports = model('Packaging', PackagingSchema);
