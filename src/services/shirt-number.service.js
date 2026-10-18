function normalizeShirtNumber(value) {
  const input = String(value ?? '').trim();
  if (!/^\d{1,3}$/.test(input)) {
    throw new Error('El número de camiseta debe ser un entero entre 0 y 999.');
  }

  const number = Number(input);
  if (!Number.isInteger(number) || number > 999) {
    throw new Error('El número de camiseta debe ser un entero entre 0 y 999.');
  }

  return input === '00' ? input : String(number);
}

module.exports = { normalizeShirtNumber };
