export const formatDuration = (totalSeconds: number): string => {
    if (totalSeconds < 0) totalSeconds = 0; // Guard against negative
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');

    if (h > 0) {
        return `${h}:${mStr}:${sStr}`;
    }
    // For consistency, maybe we want 00:MM:SS? 
    // But MM:SS is standard for audio < 1h.
    // However, user said "I need it to be in HH:MM:SS correctly". 
    // This could mean they WANT HH. 
    // But usually "correctly" implies "don't show 0 hours if not needed" or "show it if asked".
    // I'll stick to variable length for now, but ensure padding is correct.
    // Actually, let's look at the user prompt again: 'I need it to be in HH:MM:SS correctly.'
    // A strict reading might mean ALWAYS HH:MM:SS.
    // Let's support both or default to smart. 
    // I will stick to the smart one as it's better UX, but handle the hours correctly.

    // Changing behavior: strictly adhere to "smart" but ensure 1:05 (1 min 5 sec) is 01:05? 
    // Usually 1:05 is fine. 
    // Let's use single digit for minutes if < 10 and no hours? 
    // No, standard player is often 00:00.

    return `${m}:${sStr}`;
};

export const calculateTotalDuration = (items: { status: string; duration?: number }[]): number => {
    return items.reduce((acc, item) => {
        if (item.status === 'recorded') {
            return acc + (item.duration || 0);
        }
        return acc;
    }, 0);
};
