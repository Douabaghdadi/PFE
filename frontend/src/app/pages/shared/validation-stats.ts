import type { StatutValidation, ValidationFiche } from '../../services/validation-fiche.service';

export interface ValidationDef {
  statut: StatutValidation;
  label: string;
  /** Mêmes teintes que les pastilles de statut : ambre en attente, rouge à reprendre, vert acquis. */
  pill: string;
}

export const VALIDATION_DEFS: ValidationDef[] = [
  { statut: 'A_VALIDER', label: 'À valider', pill: 'pill-en_attente' },
  { statut: 'A_CORRIGER', label: 'À corriger', pill: 'pill-annule' },
  { statut: 'VALIDEE', label: 'Validée', pill: 'pill-termine' },
];

export function statutValidation(validation: ValidationFiche | null | undefined): StatutValidation {
  return validation?.statut ?? 'A_VALIDER';
}

export function validationDef(validation: ValidationFiche | null | undefined): ValidationDef {
  return VALIDATION_DEFS.find(d => d.statut === statutValidation(validation))!;
}

/** Une fiche validée une fois ne se supprime plus, même modifiée depuis. Elle reste modifiable et repart alors au pilote qualité. */
export function suppressionInterdite(validation: ValidationFiche | null | undefined): boolean {
  return !!validation?.dejaValidee || statutValidation(validation) === 'VALIDEE';
}

/** Ce que le chef de projet doit savoir en ouvrant le formulaire : tout enregistrement renvoie la fiche au pilote qualité. */
export function rappelModification(validation: ValidationFiche | null | undefined): string | null {
  switch (statutValidation(validation)) {
    case 'A_CORRIGER':
      return `Correction demandée par ${validation?.piloteNom} : « ${validation?.motif} » Une fois enregistrée, la fiche repartira au pilote qualité.`;
    case 'VALIDEE':
      return 'Cette fiche est validée. Si vous l\'enregistrez, elle repassera « À valider » et le pilote qualité devra la valider de nouveau.';
    default:
      return null;
  }
}
