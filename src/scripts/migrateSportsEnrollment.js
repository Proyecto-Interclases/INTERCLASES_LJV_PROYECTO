const mongoose = require('mongoose');
const { SPORTS } = require('../constants/sports');

const args = new Set(process.argv.slice(2));
if (!args.has('--apply')) {
  console.log('Migración en modo seguro: no se realizó ninguna conexión ni escritura.');
  console.log('Para aplicar: npm run migrate:sports -- --apply --confirm-safe-migration');
  process.exit(0);
}
if (!args.has('--confirm-safe-migration')) {
  console.error('Falta --confirm-safe-migration. No se realizó ninguna conexión ni escritura.');
  process.exit(1);
}

async function migrate() {
  const { connectDB } = require('../config/db');
  const Team = require('../models/Team');
  const Match = require('../models/Match');
  const EnrollmentSetting = require('../models/EnrollmentSetting');

  await connectDB();
  try {
    const legacyFilter = { $or: [{ deporte: { $exists: false } }, { deporte: null }, { deporte: '' }] };
    const [teamsToUpdate, matchesToUpdate] = await Promise.all([
      Team.countDocuments(legacyFilter),
      Match.countDocuments(legacyFilter)
    ]);
    console.log(`Equipos que recibirán deporte=futbol: ${teamsToUpdate}`);
    console.log(`Partidos que recibirán deporte=futbol: ${matchesToUpdate}`);

    const [teamResult, matchResult] = await Promise.all([
      Team.updateMany(legacyFilter, { $set: { deporte: 'futbol' } }),
      Match.updateMany(legacyFilter, { $set: { deporte: 'futbol' } })
    ]);
    const settings = await EnrollmentSetting.bulkWrite(SPORTS.map(({ id }) => ({
      updateOne: {
        filter: { deporte: id },
        update: { $setOnInsert: { deporte: id, abierto: false } },
        upsert: true
      }
    })));
    console.log(`Equipos actualizados: ${teamResult.modifiedCount}`);
    console.log(`Partidos actualizados: ${matchResult.modifiedCount}`);
    console.log(`Disponibilidades creadas si faltaban: ${settings.upsertedCount || 0}. Los valores existentes se conservaron.`);
    console.log('Migración completada. No se borró ni reemplazó ningún equipo, jugador o partido.');
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((error) => {
  console.error('No se pudo completar la migración:', error.message);
  process.exitCode = 1;
});
