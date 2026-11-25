/**
 * Safety guardrail — pure logic.
 *
 * Any time during a run the user can log a bad reaction. The app does one thing
 * with it: tell them to stop and get help, and pause the experiment. It never
 * gives medical advice, never guesses at a cause, and never says it's fine to
 * keep going. The copy here is the whole of what the app says, so it lives in
 * one place and is pinned by tests.
 *
 * Blinding: a blinded user doesn't know which cup held the supplement today,
 * but they always know which supplement they're testing. The message names it
 * so they can tell a clinician, without revealing today's arm.
 */
import type { ReactionSeverity } from '@/db/types';

export type ReactionOption = {
  severity: ReactionSeverity;
  title: string;
  /** Examples, so the user can pick without judging severity themselves. */
  examples: string;
};

/** The two choices on the "log a bad reaction" screen, most urgent first. */
export const REACTION_OPTIONS: readonly ReactionOption[] = [
  {
    severity: 'severe',
    title: 'It feels serious',
    examples:
      'Trouble breathing, swelling of the face, lips or throat, chest pain, fainting, a seizure, or sudden confusion.',
  },
  {
    severity: 'unwell',
    title: 'Something feels wrong',
    examples: 'A rash, a racing heart, a headache, an upset stomach, anxiety, or anything else that worries you.',
  },
];

export type SafetyMessage = {
  /** True for the call-emergency-services message. */
  emergency: boolean;
  title: string;
  /** Short paragraphs, shown in order. */
  lines: string[];
};

/** US Poison Control, free and open 24/7. A number, not advice. */
export const POISON_CONTROL_US = '1-800-222-1222';

/** What the app tells the user after they log a reaction. */
export function safetyMessage(severity: ReactionSeverity, supplementName: string): SafetyMessage {
  const tell = `Tell them you’ve been taking ${supplementName}, and bring the label if you can.`;
  if (severity === 'severe') {
    return {
      emergency: true,
      title: 'Call emergency services now',
      lines: [
        'Call 911 (or your local emergency number) now. Don’t wait to see if it passes.',
        'Don’t take any more doses.',
        tell,
      ],
    };
  }
  return {
    emergency: false,
    title: 'Stop and get help',
    lines: [
      'Stop taking it. Don’t take any more doses.',
      `Talk to a doctor or pharmacist. ${tell}`,
      `If it gets worse, call 911 (or your local emergency number). In the US, Poison Control is free 24/7 at ${POISON_CONTROL_US}.`,
    ],
  };
}

/** Shown under every safety message: the app is not a source of medical advice. */
export const NOT_MEDICAL_ADVICE =
  'Placebo can’t give medical advice. Only a doctor or pharmacist can tell you whether it’s safe to keep going.';

/** Shown before the user resumes a paused run. */
export const RESUME_WARNING = 'Only resume if a doctor or pharmacist has told you it’s OK to keep taking it.';
