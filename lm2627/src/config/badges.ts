import type { Badge } from '../types';

/**
 * Achievements. `check` lives in lib/badges.ts so this file stays a plain,
 * readable list you can add to.
 */
export const BADGES: Badge[] = [
  {
    id: 'first-exact',
    title: 'Prvý presný tip',
    description: 'Trafil si presný výsledok zápasu.',
    emoji: '🎯',
  },
  {
    id: 'ten-together',
    title: '10 zápasov spolu',
    description: 'Spolu sme pozerali aspoň 10 zápasov.',
    emoji: '🛋️',
  },
  {
    id: 'all-favourite-matches',
    title: 'Videli sme všetky zápasy nášho tímu',
    description: 'Pozerali sme spolu všetkých 8 zápasov obľúbeného tímu v ligovej fáze.',
    emoji: '💙',
  },
  {
    id: 'picked-finalist',
    title: 'Trafil si finalistu',
    description: 'Tvoj tip vo veľkej predpovedi sa dostal do finále.',
    emoji: '🔮',
  },
  {
    id: 'matchday-champion',
    title: 'Šampión kola',
    description: 'Získal si najviac bodov v hracom kole.',
    emoji: '🏆',
  },
  {
    id: 'perfect-matchday',
    title: 'Deväť z deviatich',
    description: 'Zadal si tip na každý zápas hracieho kola.',
    emoji: '📝',
  },
  {
    id: 'goal-fest',
    title: 'Gólová hostina',
    description: 'Zapísali sme zápas so 6 a viac gólmi.',
    emoji: '⚽',
  },
  {
    id: 'five-stars',
    title: 'Zápas roka',
    description: 'Dali sme zápasu 5 hviezdičiek.',
    emoji: '⭐',
  },
  {
    id: 'penalty-drama',
    title: 'Penaltová dráma',
    description: 'Zapísali sme dvojzápas rozhodnutý penaltami.',
    emoji: '😱',
  },
  {
    id: 'chronicler',
    title: 'Kronikár',
    description: 'Napísali sme poznámku k aspoň 20 zápasom.',
    emoji: '📖',
  },
];
