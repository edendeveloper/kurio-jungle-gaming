import { expect, type Page } from '@playwright/test'
export const nova = { email: 'nova@kurio.demo', password: 'KurioDemo123!' }
export const luna = { email: 'luna@kurio.demo', password: 'LunaDemo123!' }
export async function apiLogin(page: Page, user = nova) {
  const status = await page.evaluate(
    async (body) =>
      (
        await fetch('/api/session/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      ).status,
    user,
  )
  expect(status).toBe(200)
}
export async function uiLogin(page: Page, user = nova, returnTo = '/profile') {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  await page.getByLabel('E-mail', { exact: true }).fill(user.email)
  await page.getByLabel('Senha', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(returnTo)
}
export async function logout(page: Page) {
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL('/marketplace')
}
export async function apiRequest(
  page: Page,
  path: string,
  method = 'GET',
  body?: unknown,
) {
  await page.locator('#main').waitFor({ state: 'attached' })
  return page.evaluate(
    async ({ path, method, body }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      return { status: response.status, data: await response.json() }
    },
    { path, method, body },
  )
}
