import type { SavedWallet } from './checkout.ts'
export interface CollectorProfile {
  id: string
  displayName: string
  username: string
  email: string
  avatarUrl: string | null
}
export interface CartMerge {
  addedQuantity: number
  remainingGuestQuantity: number
  conflicts: { nftId: string; remaining: number }[]
}
export interface AccountSession {
  user: {
    id: string
    name: string
    email: string
    username: string
    avatarUrl: string | null
  } | null
  contextId: string | null
  expiresAt: number | null
  reason?: 'expired' | 'invalid'
  cartMerge?: CartMerge
}
export interface LoginInput {
  email: string
  password: string
}
export interface RegistrationInput extends LoginInput {
  username: string
  confirmation: string
}
export interface WalletRecord extends SavedWallet {
  displayName: string
  nickname: string
  isPrimary: boolean
}
