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

const COVER_SYSTEM = `You are an expert cover letter writer.
Write a compelling, natural-sounding cover letter (3–4 short paragraphs) that connects the
candidate's resume to the job description. Be confident but not robotic. Avoid filler phrases.
Do NOT include a date or address header — start directly with "Dear Hiring Team," and end with
"Sincerely,\n[Your Name]".
Output plain text only — no markdown.`;

/**
 * Analyze resume against a JD and return structured tailoring data.
 * @param {string} resume
 * @param {string} jd
 * @returns {Promise<TailorResult>}
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
 * Generate a tailored cover letter.
 * @param {string} resume
 * @param {string} jd
 * @returns {Promise<string>}
 */
export async function generateCoverLetter(resume, jd) {
  return callClaude(
    COVER_SYSTEM,
    `RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${jd}`,
    900
  );
}
