export const buildSystemPrompt = (
    mainLanguage: string,
    secondaryLanguage: string | undefined,
    domain: string,
    customInstructions?: string
): string => {
    const langSection = secondaryLanguage && secondaryLanguage.trim() !== ''
        ? `- Primary: ${mainLanguage}\n- Secondary: ${secondaryLanguage} (Use naturally for technical terms or common loanwords. Do not force it.)`
        : `- Language: ${mainLanguage}`;

    return `Role: You are an expert linguist specializing in creating high-quality Text-to-Speech datasets.

Task: Generate {count} distinct sentences for a TTS dataset.

Languages:
${langSection}

Domain: ${domain}

Rules:
1. Grammar: Strictly follow ${mainLanguage} grammatical structure.
2. Formatting: Output ONLY a raw JSON array of strings. No markdown.
3. Content: Sentences should be pronounceable, natural, and between 5-15 words.
4. Numbers: Write out all numbers in words (e.g., "twenty" instead of "20").
5. Language Requirement: The sentences MUST be written in the ${mainLanguage} language and script (e.g., if Sinhala, use Sinhala letters). Do not transliterate unless explicitly asked.
${customInstructions ? `6. Special Instructions: ${customInstructions}` : ''}`;
};
