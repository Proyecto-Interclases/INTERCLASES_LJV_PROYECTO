function gradeParts(value) {
  const parts = [];
  const gradePattern = /(\d{1,2})\s*(?:\.\s*)?(?:º|°)\s*(\d{1,2})|(\d{1,2})\s*-\s*(\d{1,2})/g;
  for (const match of String(value || '').matchAll(gradePattern)) {
    parts.push({
      grade: Number(match[1] || match[3]),
      section: Number(match[2] || match[4])
    });
  }
  return parts;
}

function teamGrade(team) {
  const grades = gradeParts(team.gradoPrincipal || team.grado);
  return grades.reduce((highest, current) => (
    current.grade > highest.grade
      || (current.grade === highest.grade && current.section > highest.section)
      ? current
      : highest
  ), { grade: 0, section: 0 });
}

function sortTeamsByGrade(teams, direction = 'desc') {
  const descending = direction !== 'asc';
  return [...teams].sort((first, second) => {
    const firstIsGermany = String(first.nombre || '').trim().toLocaleLowerCase('es') === 'alemania';
    const secondIsGermany = String(second.nombre || '').trim().toLocaleLowerCase('es') === 'alemania';
    const firstGrade = firstIsGermany && descending ? { grade: 11, section: 2.5 } : teamGrade(first);
    const secondGrade = secondIsGermany && descending ? { grade: 11, section: 2.5 } : teamGrade(second);

    return (descending ? secondGrade.grade - firstGrade.grade : firstGrade.grade - secondGrade.grade)
      || (descending ? firstGrade.section - secondGrade.section : secondGrade.section - firstGrade.section)
      || String(first.categoria || '').localeCompare(String(second.categoria || ''), 'es')
      || String(first.nombre || '').localeCompare(String(second.nombre || ''), 'es');
  });
}

module.exports = { sortTeamsByGrade };
