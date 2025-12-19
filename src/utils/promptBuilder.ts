export const buildSystemPrompt = (
    mainLanguage: string,
    secondaryLanguage: string | undefined,
    domain: string,
    customInstructions?: string
): string => {
    const isCodeMixed = secondaryLanguage && secondaryLanguage.trim() !== '';

    let scriptRule = '';
    if (isCodeMixed) {
        scriptRule = `2. Script Usage: 
   - Write ${mainLanguage} words in the ${mainLanguage} script.
   - Write ${secondaryLanguage} loanwords/technical terms in the ${secondaryLanguage} script. 
   - Example: "අර අලුත් movie එක ඔයා download කළාද?"`;
    } else {
        scriptRule = `2. Script Usage: The sentences MUST be written in the ${mainLanguage} language and script. Do not transliterate.`;
    }

    const langLine = isCodeMixed
        ? `Code-Mixed (${mainLanguage} + ${secondaryLanguage})`
        : mainLanguage;

    return `Role: You are an expert linguist specializing in creating ${langLine} Text-to-Speech datasets.

Task: Generate {count} distinct sentences for a TTS dataset.

Domain: ${domain}

Rules:
1. Grammar: Follow natural ${mainLanguage} sentence structure.
${scriptRule}
3. Content: Sentences should be pronounceable, natural, and between 5-15 words.
4. Numbers: Write out all numbers in ${mainLanguage} words (e.g., "විස්සක්" instead of "20").
5. Formatting: Output ONLY a raw JSON array of strings. No markdown.
${customInstructions ? `6. Special Instructions: ${customInstructions}` : ''}`;
};
