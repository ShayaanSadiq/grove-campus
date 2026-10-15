import crypto from 'crypto';

const DECLINE_CARD = '4000000000000002';

export function charge({ method, card }) {
  if (method === 'campus_wallet') {
    return { ok: true, transactionId: transactionId('WLT'), brand: 'Campus wallet', last4: null };
  }

  const number = String(card?.number ?? '').replace(/\s+/g, '');
  const expiry = String(card?.expiry ?? '').trim();
  const cvv = String(card?.cvv ?? '').trim();
  const name = String(card?.name ?? '').replace(/<[^>]*>/g, '').trim();
  const fields = {};

  if (name.length < 2 || name.length > 60) fields.name = 'Enter the name on the card.';
  if (!luhn(number)) fields.number = 'This card number is not valid.';
  if (!validExpiry(expiry)) fields.expiry = 'Enter a future expiry as MM/YY.';
  if (!/^\d{3,4}$/.test(cvv)) fields.cvv = 'Enter the 3 or 4 digit CVV.';

  if (Object.keys(fields).length) {
    return { ok: false, fields, error: 'The card details could not be charged.' };
  }
  if (number === DECLINE_CARD) {
    return { ok: false, declined: true, error: 'The bank declined this card. Try the campus wallet or another card.' };
  }

  return {
    ok: true,
    transactionId: transactionId('CRD'),
    brand: cardBrand(number),
    last4: number.slice(-4),
  };
}

export function luhn(number) {
  if (!/^\d{13,19}$/.test(number)) return false;
  let sum = 0;
  let alternate = false;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function validExpiry(value) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const current = now.getFullYear() * 12 + now.getMonth();
  return year * 12 + (month - 1) >= current;
}

function cardBrand(number) {
  if (/^4/.test(number)) return 'Visa';
  if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return 'Mastercard';
  if (/^6/.test(number)) return 'RuPay';
  return 'Card';
}

function transactionId(prefix) {
  const stamp = Date.now().toString(36).toUpperCase();
  const salt = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `GRV-${prefix}-${stamp}-${salt}`;
}
