/**
 * Фронтенд шлёт свободный текст (title/description/titles) в base64, чтобы
 * WAF хостинга (ModSecurity, правило "Malware.Expert — .htaccess files not
 * allowed upload") не блокировал запрос, если пользователь случайно упомянул
 * в тексте что-то вроде ".htaccess" — WAF ищет такие подстроки по всему телу
 * multipart-запроса. В base64 этой подстроки физически быть не может.
 */
export function decodeBase64Text(value: unknown): unknown {
  if (typeof value !== 'string' || value.length === 0) return value;
  try {
    return Buffer.from(value, 'base64').toString('utf-8');
  } catch {
    return value;
  }
}
