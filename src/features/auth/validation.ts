export const validEmail = (value: string) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
export const validUsername = (value: string) =>
  /^[a-zA-Z0-9_]{3,24}$/.test(value)
export const validPassword = (value: string) =>
  value.length >= 10 &&
  value.length <= 128 &&
  /[a-zA-Z]/.test(value) &&
  /\d/.test(value) &&
  /[^a-zA-Z0-9]/.test(value)
export function validateCredentials(
  input: {
    email: string
    password: string
    username?: string
    confirmation?: string
  },
  registration = false,
) {
  const errors: Record<string, string> = {}
  if (!validEmail(input.email.trim()))
    errors.email = 'Informe um e-mail válido.'
  if (!input.password || input.password.length > 128)
    errors.password = 'Informe sua senha.'
  if (registration) {
    if (!validUsername(input.username?.trim() ?? ''))
      errors.username = 'Use de 3 a 24 letras, números ou sublinhado.'
    if (!validPassword(input.password))
      errors.password =
        'Use de 10 a 128 caracteres, com letra, número e símbolo.'
    if (input.confirmation !== input.password)
      errors.confirmation = 'As senhas não correspondem.'
  }
  return errors
}
export function safeReturnTo(value: unknown): string {
  return typeof value === 'string' &&
    /^\/(?!\/|\\)/.test(value) &&
    !/[\\\r\n]/.test(value) &&
    !/^\/(login|register)([/?#]|$)/.test(value)
    ? value
    : '/profile'
}

// Dismissing authentication must never immediately re-enter a private guard.
export const isPrivatePath = (path: string) =>
  /^\/(profile|checkout)(\/|$)/.test(path)

export function publicReturnTo(value: unknown): string {
  const path = safeReturnTo(value)
  if (
    /^\/(?:[?#]|$)|^\/(marketplace|cart)([/?#]|$)|^\/nft\/[^/?#]+([?#]|$)/.test(
      path,
    )
  )
    return path
  return /^\/checkout([/?#]|$)/.test(path) ? '/cart' : '/marketplace'
}
