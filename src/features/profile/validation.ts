import { validEmail, validUsername } from '../auth/validation.ts'
export function validateProfile(input: {
  displayName: string
  username: string
  email: string
}) {
  const errors: Record<string, string> = {}
  if (
    input.displayName.trim().length < 2 ||
    input.displayName.trim().length > 80
  )
    errors.displayName = 'Use de 2 a 80 caracteres.'
  if (!validUsername(input.username.trim()))
    errors.username = 'Use de 3 a 24 letras, números ou sublinhado.'
  if (!validEmail(input.email.trim()))
    errors.email = 'Informe um e-mail válido.'
  return errors
}
export function validAvatar(data: unknown): data is string {
  if (typeof data !== 'string' || data.length > 360000) return false
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/.exec(
    data,
  )
  if (!match) return false
  try {
    const bytes = atob(match[2])
    if (bytes.length > 256 * 1024) return false
    return match[1] === 'png'
      ? bytes.startsWith('\x89PNG\r\n\x1a\n')
      : match[1] === 'jpeg'
        ? bytes.startsWith('\xff\xd8\xff')
        : bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP'
  } catch {
    return false
  }
}
