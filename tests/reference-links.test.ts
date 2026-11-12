import { describe, expect, it } from 'vitest';
import { isExternalReference } from '../lib/reference-links';

describe('reference boundaries', () => {
  const origin = 'https://chat.example.com';
  it('keeps routes, fragments and absolute same-origin destinations internal', () => {
    for (const href of ['/chat', '#summary', `${origin}/profile`]) {
      expect(isExternalReference(href, origin)).toBe(false);
    }
  });
  it('treats sibling services, lookalike hosts and protocol-relative sources as external', () => {
    for (const href of ['https://example.com', '//sources.example.com/page', `${origin}.evil.test/page`, 'http://chat.example.com']) {
      expect(isExternalReference(href, origin)).toBe(true);
    }
  });
  it('leaves protocol actions and missing destinations to native/safe Markdown handling', () => {
    for (const href of ['mailto:team@example.com', 'tel:123', '', undefined]) {
      expect(isExternalReference(href, origin)).toBe(false);
    }
  });
});

// Exercise the real renderer so decorating citations cannot bypass Markdown's
// URL filtering or turn internal navigation into a new-context link.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReferenceMarkdown } from '../app/components/ReferenceMarkdown';

it('renders safe external indicators without opening notices while preserving internal/protocol links and escaping HTML', () => {
  const html = renderToStaticMarkup(createElement(ReferenceMarkdown, {
    children: '[source](https://university.example/course) [profile](/profile) [email](mailto:team@example.com) [unsafe](javascript:alert) <script>bad()</script>',
  }));
  expect(html).toContain('href="https://university.example/course" target="_blank" rel="noopener noreferrer"');
  expect(html).not.toMatch(/opens? in (?:a )?new (?:tab|window)/i);
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('<a href="/profile">profile</a>');
  expect(html).toContain('<a href="mailto:team@example.com">email</a>');
  expect(html).not.toContain('href="javascript:');
  expect(html).not.toContain('<script>');
});
