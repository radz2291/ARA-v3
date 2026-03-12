import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content) return null;

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        components={{
          h1: ({ children, ...props }) => (
            <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0" {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-lg font-semibold mt-3 mb-2 first:mt-0" {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-base font-semibold mt-3 mb-1 first:mt-0" {...props}>{children}</h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="text-sm font-semibold mt-2 mb-1" {...props}>{children}</h4>
          ),
          p: ({ children, ...props }) => (
            <p className="text-sm leading-relaxed mb-3 last:mb-0" {...props}>{children}</p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside text-sm mb-3 space-y-1" {...props}>{children}</ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside text-sm mb-3 space-y-1" {...props}>{children}</ol>
          ),
          li: ({ children, ...props }) => (
            <li className="ml-2 leading-relaxed" {...props}>{children}</li>
          ),
          code: ({ className: cls, children, ...props }) => {
            const isBlock = cls?.startsWith("language-");
            if (isBlock) {
              return (
                <code
                  className={cn(
                    "block bg-muted/80 border border-border/50 px-4 py-3 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed",
                    cls
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="bg-muted/80 border border-border/40 px-1.5 py-0.5 rounded text-xs font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => (
            <pre
              className="bg-muted/80 border border-border/50 rounded-lg text-xs overflow-x-auto mb-3 not-prose"
              {...props}
            >
              {children}
            </pre>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-primary/40 pl-4 italic text-sm my-3 text-muted-foreground"
              {...props}
            >
              {children}
            </blockquote>
          ),
          a: ({ children, ...props }) => (
            <a
              className="text-primary underline underline-offset-2 hover:opacity-80"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full border-collapse text-xs" {...props}>{children}</table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              className="border border-border bg-muted px-3 py-2 text-left font-semibold"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-3 py-2" {...props}>{children}</td>
          ),
          hr: () => <hr className="border-border my-4" />,
          strong: ({ children, ...props }) => (
            <strong className="font-semibold" {...props}>{children}</strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic" {...props}>{children}</em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
