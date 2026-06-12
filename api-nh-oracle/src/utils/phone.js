function normalizePhone(phone) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return null;
  
  // Garantir formato internacional brasileiro +55
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }
  return `+${digits}`;
}

module.exports = { normalizePhone };
