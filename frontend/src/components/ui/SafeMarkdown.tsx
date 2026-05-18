'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const INTERNAL_MARKER_PATTERNS = [
  /^\s*\[(?:critical|warning|info)\/(?:exact|near_exact|semantic)\]\s*[a-z_]+:\s*/gim,
  /^\s*(?:legal_actor|legal_modality|legal_condition|legal_procedure|legal_deadline|scientific_term|causal_relation|character|narrative_action|object_detail):\s*/gim,
  /^\s*(?:legal_actor|legal_modality|legal_condition|legal_procedure|legal_deadline|scientific_term|causal_relation|character|narrative_action|object_detail)\s*$/gim,
];

function sanitizeMarkdown(source: string): string {
  let sanitized = source;

  for (const pattern of INTERNAL_MARKER_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  sanitized = sanitized.replace(/\n{3,}/g, '\n\n').trim();
  return sanitized;
}

export function SafeMarkdown({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  const safeContent = sanitizeMarkdown(content);

  return (
    <div className={`max-w-none text-stone-700 ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="mb-4 text-2xl font-bold leading-tight text-stone-800" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="mb-2 mt-5 text-xl font-semibold leading-tight text-stone-800" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="mb-2 mt-4 text-lg font-semibold leading-tight text-stone-800" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="mb-3 whitespace-pre-wrap text-base leading-7 text-stone-700 last:mb-0" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-semibold text-stone-900" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="mb-3 ml-5 list-disc space-y-1 pl-1 text-base leading-7 text-stone-700" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="mb-3 ml-5 list-decimal space-y-1 pl-1 text-base leading-7 text-stone-700" {...props} />
          ),
          li: ({ ...props }) => <li className="my-0.5 pl-1" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote className="mb-3 border-l-4 border-orange-200 pl-4 italic text-stone-600" {...props} />
          ),
        }}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
}
