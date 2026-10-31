/**
 * The living rules file: every correction you make to a video becomes a DO or a DON'T here.
 * The plan generator reads these before writing, and the checks enforce the measurable ones.
 * Format mirrors the "checks.md" idea from the YouTube-AI-Motion-Graphics workflow: short, imperative, one per line.
 */

export const EXPLAINER_RULES: { section: string; rules: string[] }[] = [
  {
    section: 'Story',
    rules: [
      'DO: open on the first sentence literally — frame one shows what the hook says.',
      'DO: one chain of cause then effect, on things already seen, that a stranger could retell from the pictures alone.',
      'DON\'T: invent numbers, quotes, logos or footage. A claim the research beats do not support gets cut.',
      'DO: every number, name and obligation verb gets a key word marker in its caption block.',
    ],
  },
  {
    section: 'Picture',
    rules: [
      'DO: one change at a time, where the eye already is. What the voice names is centred and whole.',
      'DO: hold every new picture about 2 seconds before the camera leaves it.',
      'DON\'T: put text, captions, logos or watermarks inside a generated clip. Text lives in the 2D overlay.',
      'DON\'T: label over a number.',
      'DO: keep one hero subject design across eras (same locomotive silhouette language, same palette, same lens).',
    ],
  },
  {
    section: 'Motion',
    rules: [
      'DO: start every move on a spoken word.',
      'DON\'T: cut, snap or jump inside a world; a scene change is one continuous move inside real silence.',
      'DON\'T: let the frame sit fully still for more than 1.2 seconds.',
      'DON\'T: whip, zoom or pan faster than the eye can follow; spread the move over 40–60 frames.',
      'DO: respect gravity and scale when something moves in 3D.',
    ],
  },
  {
    section: 'Platform',
    rules: [
      'DO: keep readable text out of the bottom 20% on vertical formats (platform UI overlays it).',
      'DO: keep every readable word at 32 px or larger on a 1080-wide frame.',
      'DO: level the final mix to -14 LUFS with a true peak no higher than -1.5 dBTP.',
      'DO: end on a frame that makes sense on its own, held long enough to read.',
    ],
  },
]

export function rulesAsPrompt(): string {
  return EXPLAINER_RULES.map(s => `${s.section}:\n${s.rules.map(r => `- ${r}`).join('\n')}`).join('\n\n')
}
