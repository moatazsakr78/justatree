export const OUTGOING_TYPES = ['withdrawal', 'transfer_out', 'expense', 'return', 'invoice_cancel']
export const INCOMING_TYPES = ['deposit', 'sale', 'transfer_in']

/**
 * Returns a signed amount based on transaction type.
 * Outgoing types return negative, incoming types return positive.
 * Used for read points that need signed amounts for calculations.
 */
export function getSignedAmount(amount: number, transactionType: string): number {
  return OUTGOING_TYPES.includes(transactionType) ? -Math.abs(amount) : Math.abs(amount)
}

export function isOutgoingType(transactionType: string): boolean {
  return OUTGOING_TYPES.includes(transactionType)
}
