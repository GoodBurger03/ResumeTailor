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

// ─── Interview Prep ───────────────────────────────────────────────────────────

const INTERVIEW_SYSTEM = `You are an expert interview coach.
Given a resume and job description, generate interview preparation materials.
Return ONLY valid JSON with no markdown or backticks.

Use this exact schema:
{
  "questions": [
    {
      "category": "<Behavioral|Technical|Situational|Role-Specific|Culture>",
      "question": "<the interview question>",
      "talkingPoints": ["point1", "point2", "point3"],
      "resumeAnchor": "<which specific resume experience to reference>"
    }
  ],
  "keyThemes": ["theme1", "theme2", "theme3"],
  "redFlags": ["potential gap or concern to prepare for"]
}

Generate exactly 10 questions covering: 3 behavioral, 2 technical, 2 situational, 2 role-specific, 1 culture.
talkingPoints should be drawn directly from the candidate's resume.
resumeAnchor should reference a specific job, project, or achievement from their resume.`;

export async function generateInterviewPrep(resume, jd) {
  const raw = await callClaude(
    INTERVIEW_SYSTEM,
    `RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${jd}`,
    1500
  );
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ─── Salary Insights ──────────────────────────────────────────────────────────

const SALARY_SYSTEM = `You are a compensation research specialist with deep knowledge of tech industry salaries.
Given a job title and location, provide detailed salary intelligence.
Return ONLY valid JSON with no markdown or backticks.

Use this exact schema:
{
  "title": "<normalized job title>",
  "location": "<location or 'US National'>",
  "ranges": {
    "entry": { "min": 0, "max": 0, "median": 0 },
    "mid":   { "min": 0, "max": 0, "median": 0 },
    "senior":{ "min": 0, "max": 0, "median": 0 }
  },
  "totalComp": {
    "base": 0,
    "bonus": "<typical bonus range as string>",
    "equity": "<typical equity range as string>"
  },
  "marketFactors": ["factor1", "factor2"],
  "negotiationTips": ["tip1", "tip2", "tip3"],
  "topPayingCompanies": ["company1", "company2", "company3"],
  "disclaimer": "Data based on training knowledge through early 2025. Verify with Glassdoor, Levels.fyi, or LinkedIn Salary."
}

All salary values are annual USD integers. Base estimates on your training data.`;

export async function getSalaryInsights(title, location) {
  const raw = await callClaude(
    SALARY_SYSTEM,
    `Job Title: ${title}\nLocation: ${location || 'United States (national average)'}`,
    800
  );
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ─── Follow-up Email Drafter ──────────────────────────────────────────────────

export const EMAIL_SCENARIOS = {
  afterApply: {
    label:       'After Applying',
    emoji:       '📨',
    description: 'Send 1 week after submitting — show continued interest',
    prompt:      `You are an expert career coach. Write a brief, professional follow-up email for a job application.
The email should be concise (3–4 sentences), express continued interest, briefly reiterate fit, and politely ask about next steps.
Do NOT be pushy. Start with "Dear [Hiring Manager]," and end with "Best regards,\n[Your Name]".
Output plain text only.`,
  },
  afterInterview: {
    label:       'After Interview',
    emoji:       '🤝',
    description: 'Thank-you note to send within 24 hours of an interview',
    prompt:      `You are an expert career coach. Write a warm thank-you email to send after a job interview.
Thank them for their time, reference 1–2 specific things discussed in the interview (use context provided),
reaffirm enthusiasm for the role, and mention one key reason you are a strong fit.
Keep it under 150 words. Start with "Dear [Interviewer Name]," and end with "Best regards,\n[Your Name]".
Output plain text only.`,
  },
  checkIn: {
    label:       'Silence Check-In',
    emoji:       '🔔',
    description: 'Polite nudge after 2+ weeks of no response',
    prompt:      `You are an expert career coach. Write a polite, brief check-in email when a candidate has heard nothing after 2+ weeks.
The email should be confident but not desperate. Restate interest, ask about timeline, and offer to provide additional info.
Keep it under 100 words. Start with "Dear [Hiring Team]," and end with "Best regards,\n[Your Name]".
Output plain text only.`,
  },
  afterRejection: {
    label:       'After Rejection',
    emoji:       '🔄',
    description: 'Keep the door open and request feedback',
    prompt:      `You are an expert career coach. Write a gracious response to a job rejection email.
Thank them for the opportunity, express continued admiration for the company, ask if they would share brief feedback,
and request to be considered for future roles. Keep it professional and brief — under 100 words.
Start with "Dear [Hiring Team]," and end with "Best regards,\n[Your Name]".
Output plain text only.`,
  },
};

export async function generateFollowUpEmail(scenario, context) {
  const cfg = EMAIL_SCENARIOS[scenario] || EMAIL_SCENARIOS.afterApply;
  return callClaude(
    cfg.prompt,
    `CONTEXT:\n${context}`,
    400
  );
}
