export function cleanText(value, max) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function collect(body, rules) {
  const fields = {};
  const value = {};
  for (const [key, rule] of Object.entries(rules)) {
    const result = rule(body?.[key]);
    if (result.error) fields[key] = result.error;
    else value[key] = result.value;
  }
  return { ok: Object.keys(fields).length === 0, fields, value };
}

export function badRequest(res, fields, error = 'Please check the highlighted fields.') {
  return res.status(400).json({ error, fields });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const rules = {
  name(raw) {
    const value = cleanText(raw, 80);
    if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(value)) {
      return { error: 'Use 2 to 80 letters.' };
    }
    return { value };
  },
  email(raw) {
    const value = cleanText(raw, 120).toLowerCase();
    if (!EMAIL.test(value)) return { error: 'Enter a valid email address.' };
    return { value };
  },
  password(raw) {
    const value = String(raw ?? '');
    if (value.length < 8 || value.length > 72) return { error: 'Use 8 to 72 characters.' };
    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
      return { error: 'Include an uppercase letter, a lowercase letter, and a number.' };
    }
    return { value };
  },
  studentId(raw) {
    const value = cleanText(raw, 16).toUpperCase();
    if (!/^[A-Z0-9]{4,16}$/.test(value)) return { error: 'Use 4 to 16 letters or numbers.' };
    return { value };
  },
  department(allowed) {
    return (raw) => {
      const value = cleanText(raw, 40);
      if (!allowed.includes(value)) return { error: 'Choose a department.' };
      return { value };
    };
  },
  phone(raw) {
    const value = cleanText(raw, 18);
    if (!value) return { value: '' };
    if (!/^\+?[0-9][0-9\s-]{7,16}$/.test(value)) return { error: 'Enter a valid phone number.' };
    return { value: value.replace(/[^\d+]/g, '') };
  },
  text(min, max, label) {
    return (raw) => {
      const value = cleanText(raw, max);
      if (value.length < min) return { error: `${label} needs at least ${min} characters.` };
      return { value };
    };
  },
  optionalText(max) {
    return (raw) => ({ value: cleanText(raw, max) });
  },
  integer(min, max, label) {
    return (raw) => {
      const parsed = parseInteger(raw);
      if (parsed === null || parsed < min || parsed > max) {
        return { error: `${label} must be a whole number from ${min} to ${max}.` };
      }
      return { value: parsed };
    };
  },
  oneOf(allowed, label) {
    return (raw) => {
      const value = cleanText(raw, 40);
      if (!allowed.includes(value)) return { error: `Choose a valid ${label}.` };
      return { value };
    };
  },
};

export function parseInteger(raw) {
  if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
  if (typeof raw === 'string' && /^-?\d+$/.test(raw.trim())) return Number(raw.trim());
  return null;
}

export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}
