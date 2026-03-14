import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CopyButton } from "./markdown/CopyButton";
import { TableWrapper } from "./markdown/TableWrapper";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content) return null;

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, node, ...props }) => (
            <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0" {...props}>{children}</h1>
          ),
          h2: ({ children, node, ...props }) => (
            <h2 className="text-lg font-semibold mt-3 mb-2 first:mt-0" {...props}>{children}</h2>
          ),
          h3: ({ children, node, ...props }) => (
            <h3 className="text-base font-semibold mt-3 mb-1 first:mt-0" {...props}>{children}</h3>
          ),
          h4: ({ children, node, ...props }) => (
            <h4 className="text-sm font-semibold mt-2 mb-1" {...props}>{children}</h4>
          ),
          p: ({ children, node, ...props }) => (
            <p className="text-sm leading-relaxed mb-3 last:mb-0" {...props}>{children}</p>
          ),
          ul: ({ children, node, ...props }) => (
            <ul className="list-disc list-outside text-sm mb-3 space-y-1" {...props}>{children}</ul>
          ),
          ol: ({ children, node, ...props }) => (
            <ol className="list-decimal list-inside text-sm mb-3 space-y-1" {...props}>{children}</ol>
          ),
          li: ({ children, className, node, ...props }) => {
            const isTaskListItem = className?.includes("task-list-item");

            return (
              <li
                className={cn(
                  "ml-2 leading-relaxed",
                  isTaskListItem && "list-none ml-0 flex items-start gap-2",
                  className
                )}
                {...props}
              >
                {children}
              </li>
            );
          },
          input: ({ type, checked, node, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  {...props}
                />
              );
            }
            return <input {...props} />;
          },
          code: ({ className: cls, children, node, ...props }) => {
            const isBlock = cls?.startsWith("language-");
            const codeContent = String(children).replace(/\n$/, "");

            if (isBlock) {
              return (
                <div className="relative group/code">
                  <div className="absolute right-2 top-2 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                    <CopyButton content={codeContent} />
                  </div>
                  <code
                    className={cn(
                      "block bg-muted/80 border border-border/50 px-4 py-3 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed",
                      cls
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                </div>
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
          pre: ({ children, node, ...props }) => (
            <pre
              className="bg-muted/80 border border-border/50 rounded-lg text-xs overflow-hidden mb-3 not-prose"
              {...props}
            >
              {children}
            </pre>
          ),
          blockquote: ({ children, node, ...props }) => (
            <blockquote
              className="border-l-4 border-primary/40 pl-4 italic text-sm my-3 text-muted-foreground"
              {...props}
            >
              {children}
            </blockquote>
          ),
          a: ({ children, node, ...props }) => (
            <a
              className="text-primary underline underline-offset-2 hover:opacity-80"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          table: ({ children, node, ...props }) => (
            <TableWrapper>
              <table className="w-full border-collapse" {...props}>
                {children}
              </table>
            </TableWrapper>
          ),
          thead: ({ children, node, ...props }) => (
            <thead className="bg-muted/50 border-b border-border" {...props}>
              {children}
            </thead>
          ),
          tr: ({ children, node, ...props }) => (
            <tr className="border-b border-border last:border-0 hover:bg-muted/20" {...props}>
              {children}
            </tr>
          ),
          th: ({ children, node, ...props }) => (
            <th
              className="px-4 py-2 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wider"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, node, ...props }) => (
            <td className="px-4 py-2 align-top text-xs" {...props}>
              {children}
            </td>
          ),
          hr: ({ node, ...props }) => <hr className="border-border my-4" {...props} />,
          strong: ({ children, node, ...props }) => (
            <strong className="font-semibold" {...props}>{children}</strong>
          ),
          em: ({ children, node, ...props }) => (
            <em className="italic" {...props}>{children}</em>
          ),
          del: ({ children, node, ...props }) => (
            <del className="line-through text-muted-foreground" {...props}>{children}</del>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
