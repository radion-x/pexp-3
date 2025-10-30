import React from 'react';
import { cn } from '../../lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * A simple markdown renderer that handles common formatting
 * while preserving streaming capabilities
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className,
}) => {
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (currentList.length > 0) {
        const ListTag = listType === 'ol' ? 'ol' : 'ul';
        elements.push(
          <ListTag
            key={`list-${elements.length}`}
            className={cn(
              'my-3 space-y-1',
              listType === 'ol' ? 'list-decimal' : 'list-disc',
              'ml-6'
            )}
          >
            {currentList.map((item, idx) => (
              <li key={idx} className="text-text-secondary leading-relaxed">
                {parseInlineFormatting(item)}
              </li>
            ))}
          </ListTag>
        );
        currentList = [];
        listType = null;
      }
    };

    const parseInlineFormatting = (text: string): React.ReactNode => {
      // Bold: **text** or __text__
      text = text.replace(
        /\*\*(.+?)\*\*|__(.+?)__/g,
        (_, p1, p2) => `<strong>${p1 || p2}</strong>`
      );
      // Italic: *text* or _text_
      text = text.replace(
        /\*(.+?)\*|_(.+?)_/g,
        (_, p1, p2) => `<em>${p1 || p2}</em>`
      );
      // Inline code: `code`
      text = text.replace(
        /`(.+?)`/g,
        (_, code) => `<code class="px-1.5 py-0.5 bg-surface-secondary rounded text-sm font-mono text-primary">${code}</code>`
      );

      return <span dangerouslySetInnerHTML={{ __html: text }} />;
    };

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();

      // Empty line
      if (!trimmedLine) {
        flushList();
        if (idx > 0 && idx < lines.length - 1) {
          elements.push(<div key={`space-${idx}`} className="h-2" />);
        }
        return;
      }

      // Headings
      if (trimmedLine.startsWith('#')) {
        flushList();
        const match = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const text = match[2];
          const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
          const headingClasses = cn(
            'font-semibold text-text mt-4 mb-2',
            level === 1 && 'text-2xl',
            level === 2 && 'text-xl',
            level === 3 && 'text-lg',
            level === 4 && 'text-base',
            level >= 5 && 'text-sm'
          );
          elements.push(
            <HeadingTag key={`heading-${idx}`} className={headingClasses}>
              {parseInlineFormatting(text)}
            </HeadingTag>
          );
          return;
        }
      }

      // Unordered list
      if (trimmedLine.match(/^[-*+]\s+/)) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        currentList.push(trimmedLine.replace(/^[-*+]\s+/, ''));
        return;
      }

      // Ordered list
      if (trimmedLine.match(/^\d+\.\s+/)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        currentList.push(trimmedLine.replace(/^\d+\.\s+/, ''));
        return;
      }

      // Blockquote
      if (trimmedLine.startsWith('>')) {
        flushList();
        const text = trimmedLine.replace(/^>\s*/, '');
        elements.push(
          <blockquote
            key={`quote-${idx}`}
            className="border-l-4 border-primary pl-4 py-2 my-3 italic text-text-muted"
          >
            {parseInlineFormatting(text)}
          </blockquote>
        );
        return;
      }

      // Horizontal rule
      if (trimmedLine.match(/^(---|\*\*\*|___)$/)) {
        flushList();
        elements.push(
          <hr key={`hr-${idx}`} className="my-4 border-border" />
        );
        return;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="text-text-secondary leading-relaxed my-2">
          {parseInlineFormatting(line)}
        </p>
      );
    });

    // Flush any remaining list
    flushList();

    return elements;
  };

  return (
    <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
      {renderMarkdown(content)}
    </div>
  );
};
