import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders user-written Markdown safely: raw HTML is escaped (react-markdown's default),
 * images are dropped, and links open in a new tab without passing a referrer.
 */
export function Markdown({ children, className = '' }: { children: string; className?: string }) {
    return (
        <div className={`markdown ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                disallowedElements={['img']}
                unwrapDisallowed
                components={{
                    a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                            {children}
                        </a>
                    ),
                }}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
}
