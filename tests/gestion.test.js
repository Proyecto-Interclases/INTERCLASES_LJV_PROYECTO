const test = require('node:test');
const assert = require('node:assert/strict');
const { after, before } = require('node:test');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');

const { connectDB } = require('../src/config/db');
const Team = require('../src/models/Team');
const Player = require('../src/models/Player');
const Match = require('../src/models/Match');
const User = require('../src/models/User');
const { registerUser } = require('../src/services/auth.service');
const {
  createEquipo,
  addJugador,
  createPartido,
  actualizarResultadoPartido,
  listarPartidos
} = require('../src/services/gestion.service');
const { startMatchLive, addMatchGoal, finishMatchLive } = require('../src/services/admin.service');

const testEmails = [];
const teamNames = [];

before(async () => {
  await connectDB();
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    const teams = await Team.find({ nombre: { $in: teamNames } }, '_id').lean();
    const teamIds = teams.map((team) => team._id);
    await Match.deleteMany({ $or: [{ equipoLocalId: { $in: teamIds } }, { equipoVisitanteId: { $in: teamIds } }] });
    await Player.deleteMany({ equipo_id: { $in: teamIds } });
    await Team.deleteMany({ _id: { $in: teamIds } });
    await User.deleteMany({ email: { $in: testEmails } });
    await mongoose.disconnect();
  }
});

test('un estudiante registra equipo y jugadores y se guarda el resultado del partido', async () => {
  const runId = randomUUID();
  const email = `estudiante-${runId}@ejemplo.com`;
  const localName = `Halcones ${runId}`;
  const awayName = `Tigres ${runId}`;
  testEmails.push(email);
  teamNames.push(localName, awayName);

  await registerUser({
    name: 'Estudiante Uno',
    email,
    password: 'PruebaSegura1!',
    role: 'student',
    teamName: localName
  });

  const equipoLocal = await createEquipo({ nombre: localName, categoria: 'Categoría A', emailCapitan: email });
  const equipoVisitante = await createEquipo({ nombre: awayName, categoria: 'Categoría A' });

  const jugador = await addJugador({
    equipo_id: equipoLocal.id,
    nombre: 'Carlos Torres',
    grado: '6.º 1',
    numero_camiseta: 9,
    posicion: 'Delantero'
  });

  assert.equal(jugador.nombre, 'Carlos Torres');
  assert.equal(jugador.grado, '6.º 1');
  assert.equal(jugador.numero_camiseta, '9');
  assert.equal(jugador.goles, 0);

  const jugadorDobleCero = await addJugador({
    equipo_id: equipoLocal.id,
    nombre: 'Jugador Doble Cero',
    grado: '6.º 1',
    numero_camiseta: '00'
  });
  const jugadorMismoDorsal = await addJugador({
    equipo_id: equipoLocal.id,
    nombre: 'Jugador Mismo Dorsal',
    grado: '6.º 1',
    numero_camiseta: '00'
  });
  const jugadorDorsalAlto = await addJugador({
    equipo_id: equipoLocal.id,
    nombre: 'Jugador Dorsal Alto',
    grado: '6.º 1',
    numero_camiseta: 999
  });
  assert.deepEqual(
    [jugadorDobleCero.numero_camiseta, jugadorMismoDorsal.numero_camiseta, jugadorDorsalAlto.numero_camiseta],
    ['00', '00', '999']
  );

  const partido = await createPartido({
    equipoLocalId: equipoLocal.id,
    equipoVisitanteId: equipoVisitante.id,
    fechaPartido: '2026-09-10',
    horaPartido: '18:00',
    cancha: 'Cancha principal',
    estado: 'Por jugar'
  });

  await actualizarResultadoPartido({
    partidoId: partido.id,
    golesLocal: 2,
    golesVisitante: 1
  });

  const partidos = await listarPartidos();
  const partidoGuardado = partidos.find((item) => item.id === partido.id);

  assert.ok(partidoGuardado);
  assert.equal(partidoGuardado.goles_local, 2);
  assert.equal(partidoGuardado.goles_visitante, 1);
  assert.equal(partidoGuardado.estado, 'Finalizado');
  assert.equal(partidoGuardado.resultado, `${localName} 2 - 1 ${awayName}`);
});

test('live match scores increment player goals and only one match per sport can be live', async () => {
  await Match.init();
  const runId = randomUUID();
  const names = [`Local ${runId}`, `Visitante ${runId}`, `Otro local ${runId}`, `Otro visitante ${runId}`];
  teamNames.push(...names);
  const [home, away, otherHome, otherAway] = await Promise.all(names.map((nombre) => createEquipo({
    nombre,
    categoria: 'Categoría A',
    deporte: 'baloncesto'
  })));
  const [homePlayer, awayPlayer] = await Promise.all([
    addJugador({ equipo_id: home.id, nombre: 'Anotador Local', grado: '8.º 1', numero_camiseta: '8' }),
    addJugador({ equipo_id: away.id, nombre: 'Anotador Visitante', grado: '8.º 1', numero_camiseta: '9' })
  ]);
  const scheduled = (equipoLocalId, equipoVisitanteId) => createPartido({
    equipoLocalId,
    equipoVisitanteId,
    fechaPartido: '2026-10-18',
    horaPartido: '14:00',
    cancha: 'Cancha de prueba',
    estado: 'Por jugar'
  });
  const [liveMatch, competingMatch] = await Promise.all([
    scheduled(home.id, away.id),
    scheduled(otherHome.id, otherAway.id)
  ]);

  await startMatchLive(liveMatch.id);
  await assert.rejects(startMatchLive(competingMatch.id), /Ya hay un partido en vivo para este deporte/i);
  await addMatchGoal({ matchId: liveMatch.id, side: 'local', playerId: homePlayer.id });
  await addMatchGoal({ matchId: liveMatch.id, side: 'visitante', playerId: awayPlayer.id });

  const [savedMatch, savedHomePlayer, savedAwayPlayer] = await Promise.all([
    Match.findById(liveMatch.id).lean(),
    Player.findById(homePlayer.id).lean(),
    Player.findById(awayPlayer.id).lean()
  ]);
  assert.deepEqual([savedMatch.goles_a, savedMatch.goles_b], [1, 1]);
  assert.deepEqual([savedHomePlayer.goles, savedAwayPlayer.goles], [1, 1]);

  const finished = await finishMatchLive(liveMatch.id);
  assert.equal(finished.estado, 'Finalizado');
  assert.equal(finished.resultado, `${home.nombre} 1 - 1 ${away.nombre}`);
  await assert.rejects(
    addMatchGoal({ matchId: liveMatch.id, side: 'local', playerId: homePlayer.id }),
    /Solo puedes registrar goles en un partido que esté en vivo/i
  );
});
