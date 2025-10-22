// models/Candy.js
const mongoose = require('mongoose');
const {Schema} = mongoose;

/* ---------- helpers ---------- */
const isNil = (v) => v === null || v === undefined;
const isPos = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

function round(n, d = 3) {
    if (n === null || n === undefined || Number.isNaN(n)) {
        return undefined;
    }
    const p = 10 ** d;
    return Math.round(n * p) / p;
}

/* ---------- schema ---------- */
const CandySchema = new Schema(
    {
        name: {type: String, trim: true, required: true},
        category: {type: String, trim: true, required: true},

        photoUrl: {type: String, trim: true},

        /**
         * Режим ціноутворення:
         *  - 'kg'  → базова ціна в грн/кг; якщо є weightPerPiece — рахуємо грн/шт
         *  - 'pcs' → базова ціна в грн/шт; якщо є weightPerPiece — показуємо еквівалент грн/кг
         */
        pricingMode: {
            type: String,
            enum: [
                'kg',
                'pcs'
            ],
            required: true,
            default: 'kg',
            index: true,
        },

        // ціни для 'kg'-режиму (базові)
        pricePerKgBuy: {type: Number, min: 0, default: null},
        pricePerKgSell: {type: Number, min: 0, default: null},

        // ціни для 'pcs'-режиму (базові)
        pricePerPcsBuy: {type: Number, min: 0, default: null, index: true},
        pricePerPcsSell: {type: Number, min: 0, default: null, index: true},

        // вага 1 шт, г (для конверсій між режимами)
        weightPerPiece: {type: Number, min: 0.1, default: null},

        // довідкові похідні
        piecesPerKg: {type: Number, min: 1, index: true},

        // доступність (автоматична / ручна)
        isAvailable: {type: Boolean, default: true, index: true},
        isAvailableManual: {type: Boolean, default: null}, // NEW: null=auto, true/false=форс
    },
    {timestamps: true, versionKey: false, strict: true}
);

// унікальність у межах категорії
CandySchema.index({name: 1, category: 1}, {unique: true, sparse: true});

/* ---------- recompute ---------- */
function recompute(docLike) {
    const mode = docLike.pricingMode === 'pcs' ? 'pcs' : 'kg';
    const w = docLike.weightPerPiece;

    // piecesPerKg
    if (isPos(w) === true) {
        const W = Number(w);
        docLike.piecesPerKg = Math.max(1, Math.round(1000 / W));
    } else {
        docLike.piecesPerKg = undefined;
    }

    // спочатку рахуємо АВТО-наявність
    let autoAvailable = false;

    if (mode === 'kg') {
        // грн/кг → грн/шт (за наявності ваги)
        if (isPos(docLike.pricePerKgBuy) === true && isPos(w) === true) {
            docLike.pricePerPcsBuy = round((Number(docLike.pricePerKgBuy) * Number(w)) / 1000, 3);
        } else {
            docLike.pricePerPcsBuy = undefined;
        }

        if (isPos(docLike.pricePerKgSell) === true && isPos(w) === true) {
            docLike.pricePerPcsSell = round((Number(docLike.pricePerKgSell) * Number(w)) / 1000, 3);
        } else {
            docLike.pricePerPcsSell = undefined;
        }

        autoAvailable = (isPos(docLike.pricePerKgSell) === true && isPos(w) === true);
    } else { // 'pcs'
        // грн/шт → еквіваленти грн/кг лише якщо є вага
        if (isPos(docLike.pricePerPcsBuy) === true && isPos(w) === true) {
            docLike.pricePerKgBuy = round((Number(docLike.pricePerPcsBuy) * 1000) / Number(w), 3);
        } else {
            docLike.pricePerKgBuy = null;
        }

        if (isPos(docLike.pricePerPcsSell) === true && isPos(w) === true) {
            docLike.pricePerKgSell = round((Number(docLike.pricePerPcsSell) * 1000) / Number(w), 3);
        } else {
            docLike.pricePerKgSell = null;
        }

        autoAvailable = (isPos(docLike.pricePerPcsSell) === true);
    }

    // якщо виставлено ручний оверрайд — він має пріоритет
    if (docLike.isAvailableManual === true || docLike.isAvailableManual === false) {
        docLike.isAvailable = docLike.isAvailableManual;
    } else {
        docLike.isAvailable = autoAvailable;
    }
}

/* ---------- hooks ---------- */
CandySchema.pre('validate', function(next) {
    recompute(this);
    next();
});

CandySchema.pre('findOneAndUpdate', async function(next) {
    this.setOptions({runValidators: true});

    const update = this.getUpdate() || {};
    const $set = update.$set || {};
    const $unset = update.$unset || {};

    const current = await this.model.findOne(this.getQuery()).lean();

    const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
    const pick = (key) => {
        if ($set && hasOwn($set, key)) {
            return $set[key];
        }
        if (hasOwn(update, key)) {
            return update[key];
        }
        return current ? current[key] : undefined;
    };

    const draft = {
        pricingMode: pick('pricingMode'),
        weightPerPiece: pick('weightPerPiece'),
        pricePerKgBuy: pick('pricePerKgBuy'),
        pricePerKgSell: pick('pricePerKgSell'),
        pricePerPcsBuy: pick('pricePerPcsBuy'),
        pricePerPcsSell: pick('pricePerPcsSell'),

        // NEW: підхоплюємо ручний оверрайд (або поточне значення)
        isAvailableManual: pick('isAvailableManual'),

        piecesPerKg: current ? current.piecesPerKg : undefined,
        isAvailable: current ? current.isAvailable : undefined,
    };

    // нормалізуємо режим
    if (draft.pricingMode !== 'pcs' && draft.pricingMode !== 'kg') {
        draft.pricingMode =
            current && (current.pricingMode === 'pcs' || current.pricingMode === 'kg')
                ? current.pricingMode
                : 'kg';
    }

    // перерахунок
    recompute(draft);

    // застосування похідних
    $set.piecesPerKg = draft.piecesPerKg;
    $set.isAvailable = draft.isAvailable;

    // NEW: зберегти/прибрати прапорець ручної наявності
    if (draft.isAvailableManual === true || draft.isAvailableManual === false) {
        $set.isAvailableManual = draft.isAvailableManual;
        delete $unset.isAvailableManual;
    } else {
        $unset.isAvailableManual = '';
    }

    if (draft.pricingMode === 'kg') {
        if (!isNil(draft.pricePerPcsBuy)) {
            $set.pricePerPcsBuy = draft.pricePerPcsBuy;
        } else {
            $unset.pricePerPcsBuy = '';
        }
        if (!isNil(draft.pricePerPcsSell)) {
            $set.pricePerPcsSell = draft.pricePerPcsSell;
        } else {
            $unset.pricePerPcsSell = '';
        }
        // базові грн/кг не чіпаємо
    } else { // 'pcs'
        if (!isNil(draft.pricePerKgBuy)) {
            $set.pricePerKgBuy = draft.pricePerKgBuy;
        } else {
            $unset.pricePerKgBuy = '';
        }
        if (!isNil(draft.pricePerKgSell)) {
            $set.pricePerKgSell = draft.pricePerKgSell;
        } else {
            $unset.pricePerKgSell = '';
        }
        // базові грн/шт не чіпаємо
    }

    update.$set = $set;
    update.$unset = $unset;
    this.setUpdate(update);
    next();
});

module.exports = mongoose.models.Candy || mongoose.model('Candy', CandySchema);
