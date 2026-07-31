/** Politique de mot de passe partagée (front + services). */

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_HINT = "Minimum 8 caractères, dont au moins une lettre et un chiffre";

export function isPasswordPolicyValid(password: string): boolean {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return false;
  }
  return /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

export function getPasswordPolicyError(password: string): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`;
  }
  if (!/[A-Za-z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre";
  }
  if (!/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre";
  }
  return null;
}
