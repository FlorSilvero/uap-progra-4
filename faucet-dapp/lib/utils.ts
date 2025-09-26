import { formatEther, parseEther } from 'viem'

export function formatTokenAmount(amount: string | bigint): string {
  if (typeof amount === 'string') {
    return formatEther(BigInt(amount))
  }
  return formatEther(amount)
}

export function parseTokenAmount(amount: string): bigint {
  return parseEther(amount)
}

export function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (!address) return ''
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

export function formatNumber(num: string | number): string {
  const number = typeof num === 'string' ? parseFloat(num) : num
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(number)
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}