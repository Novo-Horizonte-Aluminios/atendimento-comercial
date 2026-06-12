/**
 * Normaliza um telefone para o formato E.164.
 * Tira tudo que não for dígito. Aplica +55 se for brasileiro e ajusta se necessário.
 */
function normalizePhone(phone) {
  if (!phone) return null;

  // Remove tudo que não for número
  let digits = phone.replace(/\D/g, '');

  if (digits.length === 0) return null;

  // Assumindo que se vier só com o DDD e número, exemplo: 11999999999 (11 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }

  return `+${digits}`;
}

module.exports = { normalizePhone };
