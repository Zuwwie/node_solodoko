require('dotenv').config();
const path = require('path');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Candy = require('../data/Candy');

require('dotenv').config({path: path.resolve(__dirname, '../env/.env.local')});

/* -------------------- utils -------------------- */
const isNil = (v) => v === null || v === undefined;
const isPosNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

function round(n, d = 2) {
    if (n === null || n === undefined || Number.isNaN(n)) {
        return undefined;
    }
    const p = 10 ** d;
    return Math.round(n * p) / p;
}

function toNumber(v) {
    if (v === null || v === undefined || v === '') {
        return undefined;
    }
    if (typeof v === 'number') {
        return Number.isFinite(v) ? v : undefined;
    }
    const s = String(v).replace(',', '.')
        .replace(/\s+/g, '')
        .replace(/[^\d.\-]/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
}

const toBool01 = (v) => {
    if (typeof v === 'number') {
        return v === 1;
    }
    if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        return s === '1' || s === 'true' || s === 'так';
    }
    return false;
};

function norm(h) {
    return String(h).toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/** визначаємо ключ за назвою колонки */
function pickKey(header) {
    const h = norm(header);

    if (h.startsWith('назва')) {
        return 'name';
    }

    if (h.includes('ціна') && (h.includes('вхід') || h.includes('вх'))) {
        // значення буде «сирим» і далі інтерпретується залежно від isWeighted
        return 'priceBuyRaw';
    }
    if (h.includes('ціна') && (h.includes('продаж') || h.includes('прод'))) {
        return 'priceSellRaw';
    }

    if (h.includes('вага') && (h.includes('1шт') || h.includes('1 шт') || h.includes('за 1'))) {
        return 'weightPerPiece';
    }

    if (h.startsWith('категор')) {
        return 'category';
    }

    if (h.startsWith('вагов') || h.includes('weighted')) {
        return 'isWeighted';
    }

    return undefined;
}

/* -------------------- CLI -------------------- */
function parseArgs(argv) {
    const args = argv.slice(2);
    const file = args.find((a) => !a.startsWith('--')) || null;
    const sheet = (args.find((a) => a.startsWith('--sheet=')) || '').split('=')[1] || null;
    const dry = args.includes('--dry');
    return {file, sheet, dry};
}

function readRowsFromXlsx(filePath, sheetName) {
    const wb = XLSX.readFile(path.resolve(filePath));
    const name = sheetName || wb.SheetNames[0];
    if (!name) {
        throw new Error('У файлі не знайдено аркушів.');
    }
    const sheet = wb.Sheets[name];
    return XLSX.utils.sheet_to_json(sheet, {raw: true});
}

/* -------------------- mapping & compute -------------------- */
function mapRow(rawRow) {
    const mapped = {};
    for (const [
        k,
        v
    ] of Object.entries(rawRow)) {
        const key = pickKey(k);
        if (!key) {
            continue;
        }

        if (key === 'name' || key === 'category') {
            mapped[key] = String(v ?? '').trim();
        } else if (key === 'isWeighted') {
            mapped.isWeighted = toBool01(v);
        } else {
            mapped[key] = toNumber(v);
        }
    }

    if (!mapped.name) {
        return {error: 'Порожня Назва'};
    }
    if (!mapped.category) {
        return {error: 'Порожня Категорія'};
    }

    // за замовчуванням вважаємо вагові (щоб не зламати старі файли без колонки)
    if (typeof mapped.isWeighted !== 'boolean') {
        mapped.isWeighted = true;
    }

    return {data: mapped};
}

/**
 * На вході:
 *  - isWeighted=true  -> priceBuyRaw/priceSellRaw трактуємо як грн/кг
 *  - isWeighted=false -> priceBuyRaw/priceSellRaw трактуємо як грн/шт
 * Обчислюємо дзеркальні одиниці (грн/шт або грн/кг) при наявності weightPerPiece
 */
function computeFields(mapped) {
    const w = mapped.weightPerPiece;
    const isWeighted = !!mapped.isWeighted;

    // підготовка базових set/unset
    const $set = {
        name: mapped.name,
        category: mapped.category,
        isWeighted,
        weightPerPiece: isNil(w) ? undefined : w,
    };
    const $unset = {};

    // piecesPerKg
    if (isPosNumber(w)) {
        $set.piecesPerKg = Math.max(1, Math.round(1000 / w));
    } else {
        $unset.piecesPerKg = '';
    }

    // головні ціни
    if (isWeighted) {
        const buyKg = mapped.priceBuyRaw;
        const sellKg = mapped.priceSellRaw;

        if (!isNil(buyKg)) {
            $set.pricePerKgBuy = buyKg;
        } else {
            $unset.pricePerKgBuy = '';
        }
        if (!isNil(sellKg)) {
            $set.pricePerKgSell = sellKg;
        } else {
            $unset.pricePerKgSell = '';
        }

        // ціни за шт при наявності ваги
        if (isPosNumber(w) && !isNil(buyKg)) {
            $set.pricePerPcsBuy = round((buyKg * w) / 1000, 3);
        } else {
            $unset.pricePerPcsBuy = '';
        }

        if (isPosNumber(w) && !isNil(sellKg)) {
            $set.pricePerPcsSell = round((sellKg * w) / 1000, 3);
        } else {
            $unset.pricePerPcsSell = '';
        }

        $set.isAvailable = isPosNumber(buyKg) && isPosNumber(sellKg);
    } else {
        const buyPcs = mapped.priceBuyRaw;
        const sellPcs = mapped.priceSellRaw;

        if (!isNil(buyPcs)) {
            $set.pricePerPcsBuy = buyPcs;
        } else {
            $unset.pricePerPcsBuy = '';
        }
        if (!isNil(sellPcs)) {
            $set.pricePerPcsSell = sellPcs;
        } else {
            $unset.pricePerPcsSell = '';
        }

        // ціни за кг при наявності ваги
        if (isPosNumber(w) && !isNil(buyPcs)) {
            $set.pricePerKgBuy = round(buyPcs * (1000 / w), 2);
        } else {
            $unset.pricePerKgBuy = '';
        }

        if (isPosNumber(w) && !isNil(sellPcs)) {
            $set.pricePerKgSell = round(sellPcs * (1000 / w), 2);
        } else {
            $unset.pricePerKgSell = '';
        }

        $set.isAvailable = isPosNumber(buyPcs) && isPosNumber(sellPcs);
    }

    // прибираємо weightPerPiece якщо її немає
    if (isNil(w)) {
        $unset.weightPerPiece = '';
    }

    const update = Object.keys($unset).length ? {$set, $unset} : {$set};
    return update;
}

function buildOps(rows) {
    const ops = [];
    const skipped = [];

    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const {data, error} = mapRow(row);
        const rowNum = i + 2; // +1 header, +1 index base

        if (error) {
            skipped.push({row: rowNum, reason: error});
            continue;
        }

        const update = computeFields(data);

        ops.push({
            updateOne: {
                filter: {name: data.name, category: data.category},
                update,
                upsert: true,
            },
        });
    }

    return {ops, skipped};
}

async function runImport({file, sheet, dry}) {
    const rows = readRowsFromXlsx(file, sheet);
    if (!rows.length) {
        return {result: null, skipped: [], note: 'Немає рядків для імпорту.'};
    }

    const {ops, skipped} = buildOps(rows);
    if (!ops.length) {
        return {result: null, skipped, note: 'Немає валідних рядків.'};
    }

    if (dry) {
        return {
            result: {upsertedCount: 0, modifiedCount: 0, matchedCount: 0, dry: true, sampleOp: ops[0]},
            skipped,
        };
    }

    const res = await Candy.bulkWrite(ops, {ordered: false});
    return {result: res, skipped};
}

/* -------------------- main -------------------- */
async function main() {
    const {file, sheet, dry} = parseArgs(process.argv);
    if (!file) {
        throw new Error('Використання: node scripts/import-candies-kg.js ./data.xlsx [--sheet=Лист1] [--dry]');
    }

    const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
    if (!uri) {
        throw new Error('Задай MONGODB_URI у .env або змінних середовища.');
    }

    await mongoose.connect(uri, {autoIndex: true});
    await Candy.syncIndexes();

    const {result, skipped, note} = await runImport({file, sheet, dry});

    if (note) {
        console.log(note);
    }

    if (result) {
        const stats = result.dry
            ? {inserted: 0, modified: 0, matched: 0, skipped: skipped.length, dry: true}
            : {
                inserted: result.upsertedCount,
                modified: result.modifiedCount,
                matched: result.matchedCount,
                skipped: skipped.length,
            };

        console.log('Імпорт завершено', stats);
        if (result.dry) {
            console.dir({sampleOp: result.sampleOp}, {depth: null});
        }
    }
    if (skipped.length) {
        console.log('Пропущені (перші 10):', skipped.slice(0, 10));
    }
}

main()
    .catch((e) => {
        console.error('Помилка імпорту:', e);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await mongoose.disconnect();
        } catch (_) {
        }
    });
