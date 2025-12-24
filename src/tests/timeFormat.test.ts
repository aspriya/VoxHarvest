import { describe, it, expect } from 'vitest';
import { formatDuration, calculateTotalDuration } from '../utils/timeFormat';

describe('formatDuration', () => {
    it('formats seconds correctly (MM:SS)', () => {
        expect(formatDuration(45)).toBe('0:45');
        expect(formatDuration(5)).toBe('0:05');
    });

    it('formats minutes correctly (MM:SS)', () => {
        expect(formatDuration(65)).toBe('1:05');
        expect(formatDuration(600)).toBe('10:00');
        expect(formatDuration(3599)).toBe('59:59');
    });

    it('formats hours correctly (HH:MM:SS)', () => {
        expect(formatDuration(3600)).toBe('1:00:00');
        expect(formatDuration(3665)).toBe('1:01:05');
        expect(formatDuration(7322)).toBe('2:02:02');
    });

    it('handles zero', () => {
        expect(formatDuration(0)).toBe('0:00');
    });

    it('handles negative numbers safely', () => {
        expect(formatDuration(-10)).toBe('0:00');
    });
});

describe('calculateTotalDuration', () => {
    it('calculates total of recorded items', () => {
        const items = [
            { id: '1', text: 'a', status: 'recorded', duration: 10 },
            { id: '2', text: 'b', status: 'recorded', duration: 20 },
            { id: '3', text: 'c', status: 'pending', duration: 0 },
        ];
        // @ts-ignore
        expect(calculateTotalDuration(items)).toBe(30);
    });

    it('ignores non-recorded items', () => {
        const items = [
            { id: '1', text: 'a', status: 'pending', duration: 100 }, // Should ignore even if duration is set (though it shouldn't be)
            { id: '2', text: 'b', status: 'skipped', duration: 20 },
        ];
        // @ts-ignore
        expect(calculateTotalDuration(items)).toBe(0);
    });

    it('handles undefined duration safely', () => {
        const items = [
            { id: '1', text: 'a', status: 'recorded', duration: undefined },
            { id: '2', text: 'b', status: 'recorded', duration: 5 },
        ];
        // @ts-ignore
        expect(calculateTotalDuration(items)).toBe(5);
    });
});
