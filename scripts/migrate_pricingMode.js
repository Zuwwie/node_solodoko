// scripts/migrate_pricingMode.js
/**
 * Usage:
 *   node scripts/migrate_pricingMode.js               // dry-run (нічого не пише в БД)
 *   node scripts/migrate_pricingMode.js --apply       // зберегти зміни
 *
 * Прапорці:
 *   --default=kg | --default=pcs   // чим заповнювати "невизначені" (де немає жодної ціни). За змовчуванням: kg
 *   --list                         // у dry-run вивести _id+name невизначених
 *
 * Примітка: запускай окремо від бек-сервера, щоб не було дубль-підключення до Mongo.
 */

const path = require('path');
const mongoose = require('mongoose');

// 1) .env.local (якщо є)
try {
    require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
} catch (_) { /* ignore */ }

// 2) CLI/ENV
const MONGODB_URI =
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/master';
const APPLY = process.argv.includes('--apply');
const LIST = process.argv.includes('--list');
const DEFARG = (process.argv.find(a => a.startsWith('--default=')) || '').split('=')[1];
const DEFAULT_MODE = (DEFARG === 'kg' || DEFARG === 'pcs') ? DEFARG : 'kg'; // baseline

// 3) Модель лежить у /data, не /models
const Candy = require(path.join(process.cwd(), 'data', 'Candy.js'));

// helpers
const isPos = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Визначаємо режим для документа (строгі порівняння) */
function decidePricingMode(doc) {
    // якщо вже є валідний режим — лишаємо
    if (doc.pricingMode === 'kg' || doc.pricingMode === 'pcs') {
        return doc.pricingMode;
    }

    const hasKg = (isPos(doc.pricePerKgSell) === true) || (isPos(doc.pricePerKgBuy) === true);
    const hasPcs = (isPos(doc.pricePerPcsSell) === true) || (isPos(doc.pricePerPcsBuy) === true);

    if (hasKg === true && hasPcs === true) {return 'kg';} // історично baseline
    if (hasKg === true) {return 'kg';}
    if (hasPcs === true) {return 'pcs';}

    // жодної ціни — fallback, щоб поле було заповнене
    return DEFAULT_MODE; // 'kg' або 'pcs' згідно прапорця
}

async function run() {
    console.log(`\n▶ Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, { autoIndex: false });

    const total = await Candy.countDocuments({});
    console.log(`✔ Candies total: ${total}`);

    const cursor = Candy.find({}).cursor();

    let unchanged = 0;
    let setKg = 0;
    let setPcs = 0;
    let undecided = 0;
    const undecidedList = [];

    for await (const doc of cursor) {
        const current = doc.pricingMode;
        const decided = decidePricingMode(doc);

        if (current === 'kg' || current === 'pcs') {
            unchanged += 1;
            continue;
        }

        if (decided === 'kg' || decided === 'pcs') {
            doc.pricingMode = decided;

            if (APPLY === true) {
                try {
                    await doc.save(); // спрацює pre('validate') → recompute()
                } catch (e) {
                    console.error(`✖ Save failed for _id=${String(doc._id)} "${doc.name}":`, e?.message || e);
                }
            }

            if (decided === 'kg') {setKg += 1;}
            else {setPcs += 1;}
        } else {
            undecided += 1;
            if (LIST === true) {
                undecidedList.push({ _id: String(doc._id), name: doc.name });
            }
        }
    }

    console.log('\n—— Summary ——');
    console.log(`unchanged (already had pricingMode): ${unchanged}`);
    console.log(`set kg:  ${setKg}`);
    console.log(`set pcs: ${setPcs}`);
    console.log(`undecided: ${undecided}`);

    if (APPLY !== true) {
        console.log('\nDRY-RUN complete. Run with --apply to persist changes.');
        if (LIST === true && undecidedList.length > 0) {
            console.log('\nUndecided docs:');
            for (const it of undecidedList) {console.log(`- ${it._id}  ${it.name}`);}
        }
    } else {
        console.log('\nAPPLY complete.');
    }

    await mongoose.disconnect();
}

run().catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
});
