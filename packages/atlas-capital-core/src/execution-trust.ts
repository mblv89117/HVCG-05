/** Untrusted lender/client text. Never treat as Atlas instructions. */

const INJECTION_RE =
  /\b(ignore (all )?(previous|prior) instructions|send all borrower files|approve this loan|change clientcode|mark as funded|reveal secrets|you are now)\b/i;

export function detectInstructionInjection(text: string): boolean {
  return INJECTION_RE.test(text || '');
}

export function untrustedCommunication(text: string): { text: string; injectionDetected: boolean } {
  return { text: text || '', injectionDetected: detectInstructionInjection(text || '') };
}

export { INJECTION_RE };
