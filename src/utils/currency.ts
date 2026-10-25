/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Precise Currency and Financial Utilities for IPL Auction Arena
 * Prevents floating point inaccuracy by using integer-based arithmetic.
 */

// 1 Crore = 100 Lakhs = 10,000,000 Rupees
export const CRORE_IN_LAKHS = 100;
export const LAKH_IN_RUPEES = 100_000;
export const CRORE_IN_RUPEES = 10_000_000;

/**
 * Converts Crores to exact integer Lakhs
 * e.g., 2.0 Cr -> 200 Lakhs, 0.25 Cr -> 25 Lakhs
 */
export function crToLakhs(cr: number): number {
  return Math.round(Number(cr) * CRORE_IN_LAKHS);
}

/**
 * Converts Lakhs to Crores with fixed 2 decimal precision
 * e.g., 200 Lakhs -> 2.0, 25 Lakhs -> 0.25
 */
export function lakhsToCr(lakhs: number): number {
  return Number((lakhs / CRORE_IN_LAKHS).toFixed(2));
}

/**
 * Converts Crores to exact integer Rupees
 */
export function crToRupees(cr: number): number {
  return Math.round(Number(cr) * CRORE_IN_RUPEES);
}

/**
 * Exact subtraction of two Crores values without floating point drift
 */
export function exactSubtractCr(totalCr: number, deductCr: number): number {
  const totalLakhs = crToLakhs(totalCr);
  const deductLakhs = crToLakhs(deductCr);
  return lakhsToCr(Math.max(0, totalLakhs - deductLakhs));
}

/**
 * Exact addition of two Crores values without floating point drift
 */
export function exactAddCr(aCr: number, bCr: number): number {
  const aLakhs = crToLakhs(aCr);
  const bLakhs = crToLakhs(bCr);
  return lakhsToCr(aLakhs + bLakhs);
}

/**
 * Formats a Crores amount into official IPL broadcast currency format
 * Supports both Crore and Lakh representations:
 * - 0.20 Cr -> "₹20 L"
 * - 0.25 Cr -> "₹25 L"
 * - 0.30 Cr -> "₹30 L"
 * - 0.40 Cr -> "₹40 L"
 * - 0.50 Cr -> "₹50 L"
 * - 0.75 Cr -> "₹75 L"
 * - 1.00 Cr -> "₹1.00 Cr"
 * - 2.00 Cr -> "₹2.00 Cr"
 * - 18.00 Cr -> "₹18.00 Cr"
 */
export function formatPrice(cr: number): string {
  const numericCr = Number(cr);
  if (isNaN(numericCr) || numericCr <= 0) return '₹0';

  const lakhs = crToLakhs(numericCr);

  // If less than 1.0 Crore, display in Lakhs (e.g., ₹25 L, ₹75 L)
  if (lakhs < CRORE_IN_LAKHS) {
    return `₹${lakhs} L`;
  }

  // Display whole Crores or 2 decimal places
  if (numericCr % 1 === 0) {
    return `₹${numericCr.toFixed(0)} Cr`;
  }
  return `₹${numericCr.toFixed(2)} Cr`;
}

/**
 * Verbose price formatting (e.g., "₹25 Lakh" or "₹2.00 Crore")
 */
export function formatPriceVerbose(cr: number): string {
  const numericCr = Number(cr);
  if (isNaN(numericCr) || numericCr <= 0) return '₹0';

  const lakhs = crToLakhs(numericCr);
  if (lakhs < CRORE_IN_LAKHS) {
    return `₹${lakhs} Lakh`;
  }
  return `₹${numericCr.toFixed(2)} Crore`;
}

/**
 * Formats team purse for header and scoreboard
 * e.g., "₹120.00 Cr"
 */
export function formatPurse(cr: number): string {
  const numericCr = Number(cr);
  if (isNaN(numericCr)) return '₹0.00 Cr';
  return `₹${numericCr.toFixed(2)} Cr`;
}
