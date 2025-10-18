const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
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

// ⬇️ CORS ПЕРЕД РОУТАМИ
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];
app.use(cors({
    origin(origin, cb) {
        // дозволяємо і прямі запити з Postman (origin === undefined)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {return cb(null, true);}
        return cb(new Error('Not allowed by CORS'));
    },
    credentials: true, // якщо будуть куки/сесії (і тільки з конкретним origin!)
}));


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
