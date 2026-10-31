import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  safeReturnTo,
  publicReturnTo,
  validateCredentials,
  validPassword,
} from '../../src/features/auth/validation.ts'
import {
  validateProfile,
  validAvatar,
} from '../../src/features/profile/validation.ts'
import { walletErrors } from '../../src/features/wallets/validation.ts'
import { mergeGuestCart } from '../../src/features/cart/merge-guest.ts'
test('credentials validate required fields, strength and confirmation', () => {
  assert.equal(
    Object.keys(validateCredentials({ email: '', password: '' })).length,
    2,
  )
  assert.equal(validPassword('weak'), false)
  assert.equal(validPassword('Fictional123!'), true)
  assert.ok(
    validateCredentials(
      {
        email: 'a@demo.test',
        username: 'abc',
        password: 'Fictional123!',
        confirmation: 'different',
      },
      true,
    ).confirmation,
  )
  assert.deepEqual(
    validateCredentials(
      {
        email: 'a@demo.test',
        username: 'abc',
        password: 'Fictional123!',
        confirmation: 'Fictional123!',
      },
      true,
    ),
    {},
  )
})
test('return paths reject external URLs and authentication loops', () => {
  for (const value of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/login',
    '/register?returnTo=/profile',
    undefined,
  ])
    assert.equal(safeReturnTo(value), '/profile')
  assert.equal(
    safeReturnTo('/checkout/success?orderId=KUR-123'),
    '/checkout/success?orderId=KUR-123',
  )
})
test('closing authentication returns only to public routes without a guard loop', () => {
  for (const path of [
    '/',
    '/marketplace?search=ape',
    '/nft/emerald-ape-042',
    '/cart',
  ])
    assert.equal(publicReturnTo(path), path)
  for (const path of [
    '/profile',
    '/profile/wallets',
    '/login',
    '//external.test',
    undefined,
  ])
    assert.equal(publicReturnTo(path), '/marketplace')
  assert.equal(publicReturnTo('/checkout'), '/cart')
  assert.equal(publicReturnTo('/checkout/success?orderId=KUR-1'), '/cart')
})
test('profile and avatar contracts reject malformed input', () => {
  assert.deepEqual(
    validateProfile({
      displayName: 'Nova',
      username: 'nova',
      email: 'nova@demo.test',
    }),
    {},
  )
  assert.equal(
    Object.keys(
      validateProfile({ displayName: '', username: '!', email: 'bad' }),
    ).length,
    3,
  )
  assert.equal(validAvatar('data:image/svg+xml;base64,PHN2Zz4='), false)
  assert.equal(validAvatar('data:image/png;base64,YmFk'), false)
  assert.equal(
    validAvatar(`data:image/png;base64,${'a'.repeat(400000)}`),
    false,
  )
})
test('wallet network and provider are distinct and checked', () => {
  assert.deepEqual(
    walletErrors({
      network: 'ethereum',
      provider: 'metamask',
      address: `0x${'1'.repeat(40)}`,
      ens: 'nova.kurio.eth',
    }),
    {},
  )
  assert.deepEqual(
    walletErrors({
      network: 'ethereum',
      provider: 'metamask',
      address: `0x${'1'.repeat(40)}`,
    }),
    {},
  )
  assert.ok(
    walletErrors({
      network: 'solana',
      provider: 'metamask',
      address: `0x${'1'.repeat(40)}`,
    }).provider,
  )
  assert.ok(
    walletErrors({
      network: 'polygon',
      provider: 'walletconnect',
      address: `0x${'1'.repeat(40)}`,
      ens: 'nova.eth',
    }).ens,
  )
})
test('cart merge is bounded, preserves conflicts, distinguishes editions and is idempotent', () => {
  const owned = [{ nftId: 'a', edition: 1, quantity: 3 }],
    guest = [
      { nftId: 'a', edition: 1, quantity: 4 },
      { nftId: 'a', edition: 2, quantity: 1 },
    ],
    inventory = [{ id: 'a', edition: 1, availability: 5 }]
  const merged = mergeGuestCart(guest, owned, inventory)
  assert.equal(merged.items[0].quantity, 5)
  assert.equal(merged.addedQuantity, 2)
  assert.equal(merged.remainingGuestQuantity, 3)
  const repeated = mergeGuestCart(merged.guestItems, merged.items, inventory)
  assert.equal(repeated.addedQuantity, 0)
  assert.deepEqual(repeated.items, merged.items)
  assert.deepEqual(repeated.guestItems, merged.guestItems)
  assert.deepEqual(owned, [{ nftId: 'a', edition: 1, quantity: 3 }])
})
