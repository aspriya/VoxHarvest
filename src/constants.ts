export interface GenPreset {
    id: string;
    label: string;
    domain: string;
    mainLanguage: string;
    secondaryLanguage: string;
    description: string;
}

export const GENERATION_PRESETS: GenPreset[] = [
    {
        id: 'daily_sinhala',
        label: 'Daily Sinhala',
        domain: 'Daily Conversation, Casual, Friends',
        mainLanguage: 'Sinhala',
        secondaryLanguage: '', // Pure Sinhala
        description: 'Standard casual conversation in Sinhala.'
    },
    {
        id: 'news_formal',
        label: 'News Anchor (Formal)',
        domain: 'News Broadcasting, Formal, Clear Enunciation',
        mainLanguage: 'Sinhala',
        secondaryLanguage: '',
        description: 'Formal language suitable for news reading.'
    },
    {
        id: 'tech_review',
        label: 'Tech Reviewer (Code-Switching)',
        domain: 'Technology Reviews, Gadgets, Modern Slang',
        mainLanguage: 'Sinhala',
        secondaryLanguage: 'English',
        description: 'Tech-focused content with natural English loanwords.'
    },
    {
        id: 'educational',
        label: 'Educational / Explainers',
        domain: 'Teaching, Explaining Concepts, Clear',
        mainLanguage: 'Sinhala',
        secondaryLanguage: 'English',
        description: 'Explaining topics clearly, using English terms where necessary.'
    }
]
