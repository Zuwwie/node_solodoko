const {Schema, model} = require('mongoose');
const {USER, ADMIN} = require("../configs/roles.enum");

const UserScheme = new Schema({
    name: {type: String, trim: true},
    email: {type: String, trim: true, lowercase: true, required: true, unique: true},
    password: {type: String, required: true},
    age: {type: Number, default: 0},
    role: {type: String, enum: [USER, ADMIN], default: USER},
}, {
    timestamps: true,
    versionKey: false
});

module.exports = model("User", UserScheme);