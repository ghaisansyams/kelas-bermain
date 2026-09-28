/**
 * Where class payments are received.
 *
 * Belongs in ERP > Pengaturan once that screen can write (PRD v2.0 §6.2);
 * until then this file is the single place to change them. Deliberately not
 * inlined into any component — a wrong account number here is money lost.
 */

export interface BankAccount {
  bank: string;
  number: string;
  holder: string;
}

export const paymentAccounts: BankAccount[] = [
  { bank: "Bank BSI", number: "5676283270", holder: "Yufika Agustyani" },
  { bank: "Bank BCA", number: "7360652348", holder: "Yufika Agustyani" },
];
