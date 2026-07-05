# Mutual NDA Creator (frontend)

A Next.js prototype for creating a **Mutual Non-Disclosure Agreement** (Jira: PL-2).

The user fills in the key information on a form, sees the agreement rendered live
with those values in place, and downloads the finished document as a PDF.

## How it works

The Mutual NDA is composed of two parts, matching the source templates in the
repository's [`templates/`](../templates) directory:

- **Cover Page** — all user-editable fields (purpose, effective date, term
  lengths, governing law & jurisdiction, the two parties, and any
  modifications).
- **Standard Terms** — fixed Common Paper Mutual NDA v1.0 boilerplate, rendered
  verbatim.

The document is based on the
[Common Paper Mutual NDA](https://commonpaper.com/standards/mutual-nda/1.0/),
free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

### Download as PDF

The **Download PDF** button calls `window.print()`. A print stylesheet
(`src/app/globals.css`) reduces the printed page to just the rendered agreement,
so "Save as PDF" in the browser's print dialog produces a clean, paginated
document with no app chrome.

## Key files

| File | Purpose |
| --- | --- |
| `src/lib/nda.ts` | Domain model: form types, defaults, formatting helpers, and the Standard Terms text. |
| `src/components/NdaForm.tsx` | The input form (client component). |
| `src/components/NdaDocument.tsx` | The rendered, printable agreement. |
| `src/app/page.tsx` | Holds form state and composes the two-pane form + preview layout. |
| `src/app/globals.css` | Tailwind entry point and the print stylesheet. |

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

Built with Next.js (App Router), React, TypeScript, and Tailwind CSS.
