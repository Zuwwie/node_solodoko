// data/Order.js
const mongoose = require('mongoose');
const {Schema} = mongoose;

const Candy = require('./Candy');
const Packaging = require('./Packaging');

/* -------------------- helpers -------------------- */
const toKop = (uah) => Math.round((Number(uah) || 0) * 100);
const isTrue = (v) => v === true || v === 1 || v === '1';

/* ================== Order Schema ================== */
const OrderSchema = new Schema(
    {
        status: {
            type: String,
            enum: [
                'нове',
                'підтверджено',
                'збирається',
                'відправлено',
                'отримано'
            ],
            default: 'нове',
            index: true,
        },

        customer: {
            name: {type: String, required: true},
            phone: {type: String, required: true},
            email: String,
        },

        comment: String,

        // ---- candies (inline) ----
        candies: [{
            candyId: {type: Schema.Types.ObjectId, ref: 'Candy', required: true},

            // input
            qtyPieces: Number, // для поштучних
            weightG: Number, // для вагових

            // snapshot/derived
            name: String,
            pricingMode: {
                type: String, enum: [
                    'pcs',
                    'kg'
                ]
            },

            // для pcs
            sellUnitKop: Number,
            buyUnitKop: Number,

            // для kg
            sellPerKgKop: Number,
            buyPerKgKop: Number,

            // підсумки по позиції (за 1 пакунок)
            subtotalSellKop: Number,
            subtotalBuyKop: Number,
        },],

        // ---- packs (inline) ----
        packs: [{
            packagingId: {type: Schema.Types.ObjectId, ref: 'Packaging', required: true},
            qty: {type: Number, required: true, min: 1},

            name: String,
            sellKop: Number,
            buyKop: Number,

            subtotalSellKop: Number,
            subtotalBuyKop: Number,
        },],

        // ---- totals ----
        totalKop: {type: Number, default: 0}, // виручка
        costKop: {type: Number, default: 0}, // собівартість
        profitKop: {type: Number, default: 0}, // прибуток
        totalWeightG: {type: Number, default: 0}, // загальна вага, г (враховує множення на кількість пакунків)
    },
    {timestamps: true}
);

/* ---------- Віртуальний красивий номер ---------- */
OrderSchema.virtual('orderNumber').get(function () {
    if (!this.createdAt || !this._id) {
        return undefined;
    }

    const d = new Date(this.createdAt);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const tail = this._id.toString().slice(-6)
        .toUpperCase();

    return `ORD-${yyyy}${mm}${dd}-${tail}`;
});

/* ---------- Підрахунок перед валідацією ---------- */
// eslint-disable-next-line complexity
OrderSchema.pre('validate', async function preValidate(next) {
    try {
        const candIds = (this.candies || []).map((i) => i.candyId).filter(Boolean);
        const packIds = (this.packs || []).map((i) => i.packagingId).filter(Boolean);

        const [
            candies,
            packs
        ] = await Promise.all([
            candIds.length ? Candy.find({_id: {$in: candIds}}).lean() : [],
            packIds.length ? Packaging.find({_id: {$in: packIds}}).lean() : [],
        ]);

        const candyMap = new Map(candies.map((c) => [
            String(c._id),
            c
        ]));
        const packMap = new Map(packs.map((p) => [
            String(p._id),
            p
        ]));

        // Підсумки ЗА 1 ПАКУНОК (тільки цукерки)
        let perPackSellKop = 0;
        let perPackCostKop = 0;
        let perPackWeightG = 0;

        // Пакування (загалом)
        let packsSellKop = 0;
        let packsCostKop = 0;
        let packsCount = 0; // загальна кількість пакунків = сума qty пакувань

        /* ---- ЦУКЕРКИ: рахуємо як за 1 пакунок ---- */
        for (const it of this.candies || []) {
            const c = candyMap.get(String(it.candyId));
            if (!c) {
                continue;
            }

            it.name = c.name;

            // Режим беремо з isWeighted (0/1/true/false); якщо не задано — fallback
            const mode = isTrue(c.isWeighted)
                ? 'kg'
                : (c.pricePerPcsSell && c.pricePerPcsSell > 0 ? 'pcs' : 'kg');
            it.pricingMode = mode;

            if (mode === 'pcs') {
                const pcs = Math.max(0, Math.floor(it.qtyPieces || 0));

                const sellUnit =
                    c.piecePriceKop || toKop(c.pricePerPcsSell); // к-сть у копійках за 1 шт
                const buyUnit = toKop(c.pricePerPcsBuy);

                it.sellUnitKop = sellUnit;
                it.buyUnitKop = buyUnit;

                it.subtotalSellKop = sellUnit * pcs; // за 1 пакунок
                it.subtotalBuyKop = buyUnit * pcs; // за 1 пакунок

                perPackSellKop += it.subtotalSellKop;
                perPackCostKop += it.subtotalBuyKop;
                perPackWeightG += (c.weightPerPiece || 0) * pcs;
            } else {
                // kg
                const g = Math.max(0, Math.floor(it.weightG || 0));

                const sellPerKg = toKop(c.pricePerKgSell);
                const buyPerKg = toKop(c.pricePerKgBuy);

                it.sellPerKgKop = sellPerKg;
                it.buyPerKgKop = buyPerKg;

                it.subtotalSellKop = Math.round(sellPerKg * (g / 1000)); // за 1 пакунок
                it.subtotalBuyKop = Math.round(buyPerKg * (g / 1000)); // за 1 пакунок

                perPackSellKop += it.subtotalSellKop;
                perPackCostKop += it.subtotalBuyKop;
                perPackWeightG += g;
            }
        }

        /* ---- ПАКУВАННЯ ---- */
        for (const it of this.packs || []) {
            const p = packMap.get(String(it.packagingId));
            if (!p) {
                continue;
            }

            const qty = Math.max(0, Math.floor(it.qty || 0));
            const sell = p.priceKop || toKop(p.priceSell);
            const buy = p.priceBuyKop || toKop(p.priceBuy);

            it.name = p.name;
            it.sellKop = sell;
            it.buyKop = buy;

            it.subtotalSellKop = sell * qty;
            it.subtotalBuyKop = buy * qty;

            packsSellKop += it.subtotalSellKop;
            packsCostKop += it.subtotalBuyKop;
            packsCount += qty;
        }

        // Якщо пакувань 0 — беремо мінімум 1 пакунок (без коробки)
        const effectivePacks = Math.max(1, packsCount);

        // Фінальні підсумки за правилом:
        // total = (цукерки за 1 пакунок * кількість пакунків) + (пакування)
        const totalSell = perPackSellKop * effectivePacks + packsSellKop;
        const totalCost = perPackCostKop * effectivePacks + packsCostKop;

        this.totalKop = totalSell;
        this.costKop = totalCost;
        this.profitKop = totalSell - totalCost;
        this.totalWeightG = perPackWeightG * effectivePacks;

        next();
    } catch (e) {
        next(e);
    }
});

/* ---------- JSON view ---------- */
OrderSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => {
        ret.id = String(ret._id);
        ret.orderNumber =
            ret.orderNumber ||
            `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(
                new Date().getDate()
            ).padStart(2, '0')}-${ret.id.slice(-6).toUpperCase()}`;
        delete ret._id;
    },
});

module.exports = mongoose.model('Order', OrderSchema);
