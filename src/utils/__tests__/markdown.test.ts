import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../markdown';

describe('markdownToHtml', () => {
    it('should handle mixed ordered and unordered lists correctly', () => {
        const input = `
1. First item
* Sub item A
* Sub item B
2. Second item
* Sub item C
* Sub item D
3. Third item`;

        const expected = '<ol><li value="1">First item<ul><li>Sub item A</li><li>Sub item B</li></ul></li><li value="2">Second item<ul><li>Sub item C</li><li>Sub item D</li></ul></li><li value="3">Third item</li></ol>';

        expect(markdownToHtml(input).replace(/\s+/g, '')).toBe(expected.replace(/\s+/g, ''));
    });

    it('should handle consecutive ordered lists correctly', () => {
        const input = `
1. Item one
2. Item two
3. Item three

1. New list item one
2. New list item two`;

        const expected = '<ol><li value="1">Item one</li><li value="2">Item two</li><li value="3">Item three</li></ol><ol><li value="1">New list item one</li><li value="2">New list item two</li></ol>';

        expect(markdownToHtml(input).replace(/\s+/g, '')).toBe(expected.replace(/\s+/g, ''));
    });

    it('should handle nested lists correctly', () => {
        const input = `
1. Main item 1
  * Sub bullet A
  * Sub bullet B
2. Main item 2
  * Sub bullet C
  * Sub bullet D
3. Main item 3`;

        const expected = '<ol><li value="1">Main item 1<ul><li>Sub bullet A</li><li>Sub bullet B</li></ul></li><li value="2">Main item 2<ul><li>Sub bullet C</li><li>Sub bullet D</li></ul></li><li value="3">Main item 3</li></ol>';

        expect(markdownToHtml(input).replace(/\s+/g, '')).toBe(expected.replace(/\s+/g, ''));
    });
});