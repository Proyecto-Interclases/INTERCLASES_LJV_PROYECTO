const LEGACY_NATIONAL_FLAGS = Object.freeze({
  alemania: 'alemania',
  argentina: 'argentina',
  australia: 'australia',
  brasil: 'brasil',
  colombia: 'colombia',
  'costa-de-marfil': 'costa-de-marfil',
  egipto: 'egipto',
  espana: 'espana',
  'estados-unidos': 'estados-unidos',
  francia: 'francia',
  inglaterra: 'inglaterra',
  marruecos: 'marruecos',
  mexico: 'mexico',
  noruega: 'noruega',
  portugal: 'portugal',
  qatar: 'qatar'
});

function getTeamCrestUrl(escudoUrl) {
  const value = String(escudoUrl || '').trim();
  const legacyFlag = value.match(/^\/images\/banderas\/([a-z-]+)\.svg$/i);

  if (!legacyFlag) return value;

  const logoName = LEGACY_NATIONAL_FLAGS[legacyFlag[1].toLowerCase()];
  return logoName ? `/images/selecciones/${logoName}.png` : '';
}

module.exports = { getTeamCrestUrl };
