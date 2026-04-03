import callClaude from './claude.js';

const TAILOR_SYSTEM = `You are an expert resume coach and ATS optimization specialist.
Analyze a resume against a job description and return ONLY valid JSON — no markdown, no backticks.

Use this exact schema:
{
  "score": <0-100 integer>,
  "scoreTitle": "<e.g. 'Strong Match' | 'Moderate Match' | 'Needs Work'>",
  "scoreSummary": "<2 honest sentences about the overall fit>",
  "strongSkills": ["skill1", "skill2", ...],
  "missingSkills": ["skill1", "skill2", ...],
  "tailoredBullets": ["bullet1", "bullet2", "bullet3", "bullet4", "bullet5"],
  "tips": ["tip1", "tip2", "tip3"]
}

tailoredBullets: rewrite the candidate's strongest existing bullets so they incorporate
the JD's keywords and language. Do not fabricate experience.
tips: specific, actionable recommendations the candidate can act on before applying.`;

// Cover letter tone definitions
export const COVER_LETTER_TONES = {
  professional: {
    label:       'Professional',
    emoji:       '👔',
    description: 'Formal and polished — best for corporate, finance, or enterprise roles',
    prompt:      `You are an expert cover letter writer specializing in formal business writing.
Write a professional, polished cover letter (3–4 paragraphs) that is confident and authoritative.
Use formal language. Avoid contractions. Emphasize measurable results and technical expertise.
Do NOT include a date or address header. Start with "Dear Hiring Team," and end with "Sincerely,\n[Your Name]".
Output plain text only — no markdown.`,
  },
  conversational: {
    label:       'Conversational',
    emoji:       '💬',
    description: 'Warm and natural — great for startups, tech companies, and creative roles',
    prompt:      `You are an expert cover letter writer who specializes in authentic, human-sounding writing.
Write a warm, natural cover letter (3–4 paragraphs) that sounds like a real person wrote it — not a template.
Use a friendly tone, contractions are fine. Show genuine enthusiasm. Avoid buzzwords and filler phrases.
Do NOT include a date or address header. Start with "Dear Hiring Team," and end with "Best,\n[Your Name]".
Output plain text only — no markdown.`,
  },
  direct: {
    label:       'Direct & Bold',
    emoji:       '⚡',
    description: 'Punchy and confident — ideal for sales, leadership, and high-growth roles',
    prompt:      `You are an expert cover letter writer who writes punchy, direct, high-impact letters.
Write a bold, confident cover letter (3 tight paragraphs max) that gets to the point fast.
Lead with your strongest value. Use active voice. Be direct about what you bring and what you want.
No fluff, no lengthy setup. Do NOT include a date or address header.
Start with "Dear Hiring Team," and end with "Regards,\n[Your Name]".
Output plain text only — no markdown.`,
  },
  storytelling: {
    label:       'Storytelling',
    emoji:       '📖',
    description: 'Narrative-driven — memorable for product, design, and mission-driven roles',
    prompt:      `You are an expert cover letter writer who uses compelling narrative to make candidates memorable.
Write a story-driven cover letter (3–4 paragraphs) that opens with a brief compelling moment or insight,
then connects the candidate's journey to this specific role. Make it memorable and human.
Avoid generic openers like "I am excited to apply." Do NOT include a date or address header.
Start with "Dear Hiring Team," and end with "Warmly,\n[Your Name]".
Output plain text only — no markdown.`,
  },
  military: {
    label:       'Military Transition',
    emoji:       '🎖️',
    description: 'Translates military experience to civilian language — ideal for veterans',
    prompt:      `You are an expert cover letter writer specializing in military-to-civilian career transitions.
Write a cover letter (3–4 paragraphs) that effectively translates military experience, leadership,
and discipline into civilian business language. Avoid military jargon. Highlight transferable skills:
leadership under pressure, mission execution, cross-functional coordination, and technical expertise.
Connect the candidate's service background to the specific role requirements.
Do NOT include a date or address header. Start with "Dear Hiring Team," and end with "Respectfully,\n[Your Name]".
Output plain text only — no markdown.`,
  },
};

/**
 * Analyze resume against a JD and return structured tailoring data.
 */
export async function tailorResume(resume, jd) {
  const raw = await callClaude(
    TAILOR_SYSTEM,
    `RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${jd}`,
    1200
  );
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/**
 * Generate a tailored cover letter with a specified tone.
 * @param {string} resume
 * @param {string} jd
 * @param {keyof COVER_LETTER_TONES} tone
 */
export async function generateCoverLetter(resume, jd, tone = 'conversational') {
  const toneConfig = COVER_LETTER_TONES[tone] || COVER_LETTER_TONES.conversational;
  return callClaude(
    toneConfig.prompt,
    `RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${jd}`,
    900
  );
}
