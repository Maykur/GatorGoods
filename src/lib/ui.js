export function cn(...values) {
  return values
    .flatMap((value) => {
      if (!value) {
        return [];
      }

      if (Array.isArray(value)) {
        return value;
      }

      return [value];
    })
    .filter(Boolean)
    .join(' ');
}

export function getInitials(name = '') {
  const tokens = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return 'GG';
  }

  return tokens.map((token) => token[0]?.toUpperCase() || '').join('');
}
