/**
 * Frase que versões antigas do editor gravavam sozinhas no campo "Mensagem de
 * abertura". O usuário nunca a cadastrou, então ela nunca deve ser enviada.
 *
 * Compara ignorando maiúsculas, acentos, pontuação e emojis.
 */
const LEGACY_OPENING_KEY = 'ola aqui esta o seu link';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isLegacyOpening(text: string | null | undefined): boolean {
  return !!text && normalize(text) === LEGACY_OPENING_KEY;
}

/** Devolve '' quando o texto é a frase antiga; caso contrário, o próprio texto. */
export function stripLegacyOpening(text: string | null | undefined): string {
  return isLegacyOpening(text) ? '' : (text ?? '');
}
