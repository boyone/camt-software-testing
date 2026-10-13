// A random national ID that passes the Thai checksum, so every run registers a new voter.
export function randomThaiNationalId(): string {
  const first12 = '9' + Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
  const sum = [...first12].reduce((acc, digit, i) => acc + Number(digit) * (13 - i), 0);
  return first12 + ((11 - (sum % 11)) % 10);
}
