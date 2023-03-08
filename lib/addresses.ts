import { PublicKey } from '@solana/web3.js'

// Your shop wallet address
export const shopAddress = new PublicKey(
  // 'Er1HzKyDpYsW9ojsiStShJmhiVsJi3EoJJR21CzadKfU'
  '6EUBMxQtmP7HN31ErEZquFjkRGiKSEHnGeuyMUpL2vjn'
)

// This is the fake USD address from splfaucet.lol
export const usdcAddress = new PublicKey(
  'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
)

// This is your token/coupon address
export const couponAddress = new PublicKey(
  // '7zkZR1hswsYZzFf7HYfVpF877vfSgbbXWxMxWQZsvy6' // NFT works
  '5cMxnNEt73b1T6GJDpeT6Jo48ttAxER4vtUZx6Bn5hBe'
)
