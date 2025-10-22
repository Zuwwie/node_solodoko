require('dotenv').config();
const path = require('path');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Candy = require('../data/Candy');

require('dotenv').config({path: path.resolve(__dirname, '../env/.env.local')});

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

function norm(h) {
    return String(h).toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function pickKey(header) {
    const h = norm(header);
    if (h.startsWith('назва')) {
        return 'name';
    }
    if (h.includes('ціна') && (h.includes('вхід') || h.includes('вх'))) {
        return 'pricePerKgBuy';
    }
    if (h.includes('ціна') && (h.includes('продаж') || h.includes('прод'))) {
        return 'pricePerKgSell';
    }
    if (h.includes('вага') && (h.includes('1шт') || h.includes('1 шт') || h.includes('за 1'))) {
        return 'weightPerPiece';
    }
    if (h.startsWith('категор')) {
        return 'category';
    }
    return undefined;
}

// -------------------- CLI --------------------
function parseArgs(argv) {
    const args = argv.slice(2);
    const file = args.find((a) => !a.startsWith('--')) || null;
    const sheet =
        (args.find((a) => a.startsWith('--sheet=')) || '')
            .split('=')[1] || null;
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

function mapRow(rawRow) {
    const mapped = {};
    const entries = Object.entries(rawRow);
    for (let i = 0; i < entries.length; i += 1) {
        const k = entries[i][0];
        const v = entries[i][1];
        const key = pickKey(k);
        if (!key) {
            continue;
        }
        if (key === 'name' || key === 'category') {
            mapped[key] = String(v).trim();
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
    return {data: mapped};
}

function computeDerived(mapped) {
    const w = mapped.weightPerPiece;
    const buyKg = mapped.pricePerKgBuy;
    const sellKg = mapped.pricePerKgSell;

    let piecesPerKg;
    let pricePerPcsBuy;
    let pricePerPcsSell;

    if (isPosNumber(w)) {
        piecesPerKg = Math.max(1, Math.round(1000 / w));
        if (!isNil(buyKg)) {
            pricePerPcsBuy = round(buyKg * w / 1000, 3);
        }
        if (!isNil(sellKg)) {
            pricePerPcsSell = round(sellKg * w / 1000, 3);
        }
    }

    const isAvailable = (!isNil(buyKg) && !isNil(sellKg) && isPosNumber(w)) === true;

    return {piecesPerKg, pricePerPcsBuy, pricePerPcsSell, isAvailable};
}

function buildOp(mapped, derived) {
    const $set = {
        name: mapped.name,
        category: mapped.category,
        pricePerKgBuy: mapped.pricePerKgBuy,
        pricePerKgSell: mapped.pricePerKgSell,
        weightPerPiece: mapped.weightPerPiece,
        isAvailable: derived.isAvailable,
    };

    if (!isNil(derived.piecesPerKg)) {
        $set.piecesPerKg = derived.piecesPerKg;
    }
    if (!isNil(derived.pricePerPcsBuy)) {
        $set.pricePerPcsBuy = derived.pricePerPcsBuy;
    }
    if (!isNil(derived.pricePerPcsSell)) {
        $set.pricePerPcsSell = derived.pricePerPcsSell;
    }

    const $unset = {};
    if (isNil(derived.piecesPerKg)) {
        $unset.piecesPerKg = '';
    }
    if (isNil(derived.pricePerPcsBuy)) {
        $unset.pricePerPcsBuy = '';
    }
    if (isNil(derived.pricePerPcsSell)) {
        $unset.pricePerPcsSell = '';
    }

    const update = Object.keys($unset).length ? {$set, $unset} : {$set};

    return {
        updateOne: {
            filter: {name: mapped.name, category: mapped.category},
            update,
            upsert: true,
        },
    };
}

function buildOps(rows) {
    const ops = [];
    const skipped = [];

    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const {data, error} = mapRow(row);
        const rowNum = i + 2; // +1 заголовок +1 індекс

        if (error) {
            skipped.push({row: rowNum, reason: error});
            continue;
        }

        const derived = computeDerived(data);
        ops.push(buildOp(data, derived));
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

// -------------------- main (мінімальна складність) --------------------
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
