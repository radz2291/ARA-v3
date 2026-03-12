import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
  isLoading?: boolean;
}

export function MarkdownContent({
  content,
  className,
  isLoading = false,
}: MarkdownContentProps) {
  if (isLoading) {
    return (
      <div className="flex gap-1 py-1">
        <div className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce" />
        <div
          className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
          style={{ animationDelay: "0.1s" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
          style={{ animationDelay: "0.2s" }}
        />
      </div>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold mt-4 mb-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-bold mt-3 mb-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base font-bold mt-3 mb-1" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-sm font-bold mt-2 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => <p className="text-sm mb-2" {...props} />,
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside text-sm mb-2 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside text-sm mb-2 space-y-1" {...props} />
          ),
          li: ({ node, ...props }) => <li className="ml-2" {...props} />,
          code: ({ node, inline, ...props }) =>
            inline ? (
              <code
                className="bg-muted dark:bg-muted px-1 py-0.5 rounded text-xs font-mono"
                {...props}
              />
            ) : (
              <code
                className="block bg-muted dark:bg-muted p-2 rounded text-xs font-mono overflow-x-auto mb-2"
                {...props}
              />
            ),
          pre: ({ node, ...props }) => (
            <pre
              className="bg-muted dark:bg-muted p-3 rounded text-xs overflow-x-auto mb-2"
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-muted-foreground pl-3 italic text-sm my-2"
              {...props}
            />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-primary dark:text-primary underline hover:opacity-80"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <table
              className="w-full border-collapse text-xs my-2"
              {...props}
            />
          ),
          th: ({ node, ...props }) => (
            <th
              className="border border-border dark:border-border bg-muted dark:bg-muted p-2 text-left"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-border dark:border-border p-2" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
