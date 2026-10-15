// Importa el servicio con las reglas de negocio del torneo.
const tournamentService = require('../services/tournament.service');

// Atiende las solicitudes que piden todos los equipos.
async function listTeams(req, res) {
  // Devuelve los equipos dentro de la propiedad data.
  const data = await tournamentService.getTeams(req.query.deporte);
  res.json({ data });
}

// Atiende las solicitudes que piden todos los partidos.
async function listMatches(req, res) {
  // Devuelve los partidos enriquecidos dentro de la propiedad data.
  const data = await tournamentService.getMatches(req.query.deporte);
  res.json({ data });
}

// Exporta los controladores para conectarlos con las rutas de la API.
module.exports = { listTeams, listMatches };
