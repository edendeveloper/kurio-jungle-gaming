import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateTotals,
  decimalEth,
  ethUnits,
  formatEth,
  lineSubtotal,
} from '../../src/lib/money.ts'
import { validateCheckout } from '../../src/features/checkout/validation.ts'
import { clampQuantity } from '../../src/features/nft/utils.ts'
import { RealtimeVersionTracker, belongsToUser, canTransitionOrder } from '../../src/features/realtime/versioning.ts'
import { parseNftUpdatedEvent, parseOrderUpdatedEvent } from '../../src/types/realtime.ts'

test('ETH preserves 18 places and calculates without floating point', () => {
  assert.equal(lineSubtotal('0.123456789123456789', 3), '0.370370367370370367')
  assert.equal(formatEth(ethUnits('0.1') + ethUnits('0.2')), '0.3')
  assert.equal(decimalEth('0001.1900'), '1.19')
  for (const value of ['-1', 'NaN', '1e3', '0.0000000000000000001', 1.19])
    assert.equal(decimalEth(value), undefined)
  for (const quantity of [-1, 0.5, NaN, Infinity])
    assert.throws(() => lineSubtotal('1', quantity))
})

test('realtime events are validated and resource versions reject duplicates and stale updates', () => {
  const tracker = new RealtimeVersionTracker()
  assert.equal(tracker.accept('evt-10', 'nft:ape', 10), true)
  assert.equal(tracker.accept('evt-10', 'nft:ape', 10), false)
  assert.equal(tracker.accept('evt-8', 'nft:ape', 8), false)
  assert.equal(tracker.accept('evt-10b', 'nft:ape', 10), false)
  assert.equal(tracker.accept('evt-11', 'nft:ape', 11), true)
  assert.equal(tracker.accept('evt-rest-old', 'nft:ape', 10, 12), false)
  assert.equal(tracker.version('nft:ape'), 11)
  assert.equal(
    parseNftUpdatedEvent({
      eventId: 'evt', nftId: 'ape', version: 1, priceEth: '1.2',
      availableQuantity: 0, updatedAt: new Date().toISOString(),
    })?.version,
    1,
  )
  assert.equal(parseNftUpdatedEvent({ eventId: 'bad', priceEth: 'NaN' }), null)
})

test('order status transitions are terminal after confirmation or rejection', () => {
  assert.equal(belongsToUser('user-1', 'user-1'), true)
  assert.equal(belongsToUser('user-1', 'user-2'), false)
  assert.equal(belongsToUser('user-1', undefined), false)
  assert.equal(canTransitionOrder('processing', 'confirmed'), true)
  assert.equal(canTransitionOrder('processing', 'rejected'), true)
  assert.equal(canTransitionOrder('confirmed', 'processing'), false)
  assert.equal(canTransitionOrder('rejected', 'confirmed'), false)
  assert.equal(canTransitionOrder('confirmed', 'confirmed'), true)
  assert.equal(
    parseOrderUpdatedEvent({
      eventId: 'ord-1', orderId: 'KUR-1', ownerUserId: 'user-1', version: 2,
      status: 'confirmed', updatedAt: new Date().toISOString(),
    })?.status,
    'confirmed',
  )
  assert.equal(parseOrderUpdatedEvent({ status: 'unknown' }), null)
})
test('discount, fee and total are exact, and percentage floors at one wei', () => {
  assert.deepEqual(
    calculateTotals(
      [{ priceEth: '1.19', quantity: 3, network: 'ethereum' }],
      'kurio10',
    ).totals,
    {
      subtotalEth: '3.57',
      discountEth: '0.357',
      networkFeeEth: '0.016',
      totalEth: '3.229',
    },
  )
  assert.equal(
    calculateTotals(
      [{ priceEth: '0.000000000000000019', quantity: 1, network: 'ethereum' }],
      'KURIO10',
    ).totals.discountEth,
    '0.000000000000000001',
  )
})
test('fixed coupon cannot exceed subtotal; fees apply once per distinct network', () => {
  assert.deepEqual(
    calculateTotals(
      [{ priceEth: '0.01', quantity: 1, network: 'polygon' }],
      'LAUNCH5',
    ).totals,
    {
      subtotalEth: '0.01',
      discountEth: '0.01',
      networkFeeEth: '0.002',
      totalEth: '0.002',
    },
  )
  assert.equal(
    calculateTotals([
      { priceEth: '1', quantity: 1, network: 'ethereum' },
      { priceEth: '2', quantity: 1, network: 'ethereum' },
      { priceEth: '1', quantity: 1, network: 'solana' },
    ]).totals.networkFeeEth,
    '0.017',
  )
  assert.equal(calculateTotals([]).totals.totalEth, '0')
})
test('coupon failures and removal are deterministic', () => {
  const lines = [{ priceEth: '1', quantity: 1, network: 'ethereum' }]
  for (const [code, status] of [
    ['EXPIRED', 'expired'],
    ['POLYGON20', 'incompatible'],
    ['WRONG', 'invalid'],
  ]) {
    const result = calculateTotals(lines, code)
    assert.equal(result.coupon?.status, status)
    assert.equal(result.totals.discountEth, '0')
  }
  assert.equal(calculateTotals(lines, null).coupon, null)
  assert.equal(
    calculateTotals([{ ...lines[0], network: 'polygon' }], 'POLYGON20').totals
      .discountEth,
    '0.2',
  )
})
const valid = {
  quoteId: 'quote-demo',
  collector: {
    displayName: 'Nova',
    username: 'nova_1',
    email: 'NOVA@example.com',
  },
  wallet: {
    address: `0x${'1'.repeat(40)}`,
    network: 'ethereum',
    provider: 'metamask',
  },
}
test('quantity is bounded by stock and cannot be zero, negative or fractional', () => {
  assert.equal(clampQuantity(9, 5), 5)
  assert.equal(clampQuantity(4, 2), 2)
  for (const value of [0, -1, NaN, 1.5])
    assert.equal(clampQuantity(value, 5), 1)
  assert.equal(clampQuantity(1, 0), 1) // sold-out purchase control is disabled by the page
})
test('checkout normalizes input and does not require optional profile or ENS', () => {
  assert.equal(
    validateCheckout(valid).data?.collector.email,
    'nova@example.com',
  )
  assert.ok(validateCheckout(valid).data)
})
test('checkout rejects required fields, formats and incompatible wallets', () => {
  assert.equal(Object.keys(validateCheckout({}).errors).length, 7)
  assert.ok(
    validateCheckout({ ...valid, wallet: { ...valid.wallet, address: 'bad' } })
      .errors.address,
  )
  assert.ok(
    validateCheckout({
      ...valid,
      wallet: { ...valid.wallet, network: 'solana' },
    }).errors.provider,
  )
  assert.ok(
    validateCheckout({
      ...valid,
      wallet: { ...valid.wallet, network: 'polygon', ens: 'kurio.eth' },
    }).errors.ens,
  )
  assert.ok(
    validateCheckout({
      ...valid,
      wallet: {
        address: '7'.repeat(32),
        network: 'solana',
        provider: 'walletconnect',
      },
    }).data,
  )
})
