// data/Candy.js
const {Schema, model} = require('mongoose');

function round2(n) {
    return n === null ? n : Math.round(n * 100) / 100;
}

const CandySchema = new Schema(
    {
        name: {type: String, trim: true, required: true, unique: true},
        category: {type: String, trim: true, required: true},

        isAvailable: {type: Boolean, default: true, index: true}, // наявність
        photoUrl: {type: String, trim: true}, //ФОТО

        // ціни за 1000 г (грн/кг)
        pricePerKgBuy: {type: Number, required: true, min: 0},
        pricePerKgSell: {type: Number, required: true, min: 0},

        // вага 1 шт в грамах
        weightPerPiece: {type: Number, required: true, min: 0.1},

        // АВТО: рахуємо і зберігаємо
        piecesPerKg: {type: Number, min: 1, index: true},
        pricePerPcsBuy: {type: Number, min: 0, index: true},
        pricePerPcsSell: {type: Number, min: 0, index: true}
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// --------- CREATE/SAVE ----------
CandySchema.pre('validate', function (next) {
    // Рахуємо лише якщо є базові величини
    const w = this.weightPerPiece;
    if (w && w > 0) {
        const pieces = Math.max(1, Math.floor(1000 / w));
        this.piecesPerKg = pieces;

        if (this.pricePerKgBuy !== null) {
            this.pricePerPcsBuy = round2(this.pricePerKgBuy / pieces);
        }
        if (this.pricePerKgSell !== null) {
            this.pricePerPcsSell = round2(this.pricePerKgSell / pieces);
        }
    } else {
        this.piecesPerKg = undefined;
        this.pricePerPcsBuy = undefined;
        this.pricePerPcsSell = undefined;
    }
    next();
});

// --------- UPDATE (findOneAndUpdate / findByIdAndUpdate) ----------
CandySchema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate() || {};
    const $set = update.$set || {};
    // поточний документ (щоб мати старі значення якщо не передані в апдейті)
    const current = await this.model.findOne(this.getQuery()).lean();

    const w = ($set.weightPerPiece ?? update.weightPerPiece ?? current?.weightPerPiece);
    const buyKg = ($set.pricePerKgBuy ?? update.pricePerKgBuy ?? current?.pricePerKgBuy);
    const sellKg = ($set.pricePerKgSell ?? update.pricePerKgSell ?? current?.pricePerKgSell);

    if (w && w > 0) {
        const pieces = Math.max(1, Math.floor(1000 / Number(w)));
        $set.piecesPerKg = pieces;

        if (buyKg !== null) {
            $set.pricePerPcsBuy = round2(Number(buyKg) / pieces);
        }
        if (sellKg !== null) {
            $set.pricePerPcsSell = round2(Number(sellKg) / pieces);
        }
    } else {
        $set.piecesPerKg = undefined;
        $set.pricePerPcsBuy = undefined;
        $set.pricePerPcsSell = undefined;
    }

    update.$set = $set;
    this.setUpdate(update);
    next();
});

module.exports = model('Candy', CandySchema);
