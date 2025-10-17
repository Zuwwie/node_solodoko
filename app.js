const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const {say} = require('cowsay');

const {PORT, MONGO_URL} = require('./configs/variables');
const mainRouter = require("./api/api.router");

const app = express();

mongoose.set('debug', true);
mongoose.set('strictQuery', true)
mongoose.connect(MONGO_URL).then(r => {
});


app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/api', mainRouter);
app.use(_notFoundError);
app.use(_mainErrorHandler);


app.listen(PORT, () => {
    console.log(say({text: `Listening on port ${PORT} .`}));
});


function _notFoundError(req, res, next) {
    res.status(404).json('Not Found');
}

function _mainErrorHandler(err, req, res, next) {
    res
        .status(err.status || 500)
        .json({
            error: err.message || 'Something went wrong',
            statusCode: err.status || 500
        });
}
