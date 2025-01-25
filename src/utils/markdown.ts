// Simple markdown parser
export const markdownToHtml = (markdown: string) => {
    // First, process ordered lists and mark their boundaries
    const processedMarkdown = markdown.replace(
        /^( *)\d+\. (.*?)$/gm,
        (match, indent, content) => {
            const number = match.match(/^\d+/)?.[0] || '1';
            return `${indent}__ordered_list_${number}__ ${content}`;
        }
    );

    let html = processedMarkdown
        // Non-list processing first
        .replace(/^---+$/gm, '<hr />')
        .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
        .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^>(.+)/gm, '<blockquote>$1</blockquote>')
        .replace(/```([\s\S]*?)```/g, '<pre><code><p>$1</p></code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')

        // Group unordered lists
        .replace(/(?:(^|\n)( *)[-*+][^\n]*)+/g, (match) => {
            const items = match.split('\n').filter(Boolean);
            const listItems = items.map(item =>
                `<li>${item.replace(/^ *[-*+] /, '')}</li>`
            ).join('');
            return `<ul>${listItems}</ul>`;
        })

        // Group ordered lists
        .replace(/(?:(^|\n)( *)__ordered_list_\d+__[^\n]*)+/g, (match) => {
            const items = match.split('\n').filter(Boolean);
            let inNewList = true;
            let html = '';

            items.forEach(item => {
                const [, num, content] = item.match(/__ordered_list_(\d+)__ (.*)/) || [];
                if (num === '1' && !inNewList) {
                    html += '</ol><ol>';
                    inNewList = true;
                }
                html += `<li value="${num}">${content}</li>`;
                inNewList = false;
            });

            return `<ol>${html}</ol>`;
        })

        // Paragraphs (after list processing)
        .replace(/^\s*(\n)?(.+)/gm, function(m) {
            return /<(\/)?(h\d|ul|ol|li|blockquote|pre|code)/.test(m) ? m : '<p>'+m+'</p>';
        });

    // Clean up
    html = html
        .replace(/<(ul|ol)>\s*<\/(ul|ol)>/g, '')
        .replace(/\n/g, '');

    return html;
};