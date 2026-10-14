const mongoose = require('mongoose');

const { connectDB } = require('../config/db');
const Match = require('../models/Match');
const Player = require('../models/Player');
const Team = require('../models/Team');
const User = require('../models/User');
const mundialito2026Teams = require('./mundialito2026.data');

async function seedMundialito2026() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB no está conectado. Ejecuta connectDB() antes del seed.');
  }

  const session = await mongoose.startSession();
  let insertedPlayers = 0;
  try {
    await session.withTransaction(async () => {
      await Player.deleteMany({}, { session });
      await Match.deleteMany({}, { session });
      await Team.deleteMany({}, { session });
      await User.updateMany({ teamName: { $ne: null } }, { $set: { teamName: null } }, { session });

      const teams = await Team.insertMany(
        mundialito2026Teams.map(({ nombre, categoria, escudoUrl }) => ({ nombre, categoria, escudoUrl })),
        { session }
      );
      const teamIds = new Map(teams.map((team) => [team.nombre, team._id]));
      const players = mundialito2026Teams.flatMap((team) => team.jugadores.map((nombre) => ({
        equipo_id: teamIds.get(team.nombre),
        nombre,
        grado: team.grado,
        posicion: '',
        numero_camiseta: 0,
        goles: 0
      })));
      const createdPlayers = await Player.insertMany(players, { session });
      insertedPlayers = createdPlayers.length;
    });
  } finally {
    await session.endSession();
  }

  console.log(`Mundialito 2026 cargado: ${mundialito2026Teams.length} equipos y ${insertedPlayers} jugadores.`);
  return { equipos: mundialito2026Teams.length, jugadores: insertedPlayers };
}

if (require.main === module) {
  if (!process.argv.includes('--confirm-reset')) {
    console.error('Carga cancelada. Para borrar equipos, jugadores, partidos y asignaciones anteriores, ejecuta: npm run seed:mundialito -- --confirm-reset');
    process.exitCode = 1;
  } else {
    require('dotenv').config();
    (async () => {
      try {
        await connectDB();
        await seedMundialito2026();
      } catch (error) {
        console.error('Error al cargar Mundialito 2026:', error);
        process.exitCode = 1;
      } finally {
        if (mongoose.connection.readyState !== 0) {
          try {
            await mongoose.disconnect();
          } catch (error) {
            console.error('No se pudo cerrar la conexión con MongoDB:', error);
            process.exitCode = 1;
          }
        }
      }
    })();
  }
}

module.exports = { seedMundialito2026 };
