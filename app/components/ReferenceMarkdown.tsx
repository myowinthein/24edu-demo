'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isExternalReference } from '@/lib/reference-links';

// All callers display an active conversation or its review/summary. Keep
// external sources alongside that task; internal navigation stays in place.
export function ReferenceMarkdown({ children }: { children: string }) {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      a: ({ node: _node, children: label, href, ...props }) => {
        const external = isExternalReference(href, origin);
        return (
          <a {...props} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
            {label}
            {external && <>
              {' '}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ display: 'inline', verticalAlign: 'baseline' }}>
                <path d="M14 3h7v7M10 14 21 3M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
              </svg>
            </>}
          </a>
        );
      },
    }}>{children}</ReactMarkdown>
  );
}
