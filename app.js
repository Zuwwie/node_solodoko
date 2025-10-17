const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({path: path.join(__dirname, 'env', '.env.local')});
const {say} = require('cowsay');

const {PORT, MONGO_URL} = require('./configs/variables');
const mainRouter = require('./api/api.router');
const ApiError = require('./errors/ApiError');

const app = express();

mongoose.set('debug', true);
mongoose.set('strictQuery', true);
mongoose.connect(MONGO_URL);


app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/api', mainRouter);
app.use(_notFoundError);
app.use(_mainErrorHandler);


app.listen(PORT, () => {
    console.log(say({text: `Listening on port ${PORT} .`}));
});


function _notFoundError(req, res, next) {
    next(new ApiError('Route Not Found', 404));
}

// eslint-disable-next-line no-unused-vars
function _mainErrorHandler(err, req, res, next) {
    res
        .status(err.status || 500)
        .json({
            error: err.message || 'Something went wrong',
            statusCode: err.status || 500
        });
}
