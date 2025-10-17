const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const {say} = require('cowsay');

const {PORT, MONGO_URL} = require('./configs/variables');
const mainRouter = require("./api/api.router");

const app = express();

mongoose.set('debug', true);
mongoose.set('strictQuery', true)
mongoose.connect(MONGO_URL).then(r => {});


app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/api', mainRouter);


app.listen(PORT, () => {
    console.log(say({text: `Listening on port ${PORT} .`}));
});