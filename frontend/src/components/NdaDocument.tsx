import {
  ATTRIBUTION,
  STANDARD_TERMS,
  describeConfidentiality,
  describeNdaTerm,
  formatEffectiveDate,
  orPlaceholder,
  type NdaFormData,
  type Party,
} from "@/lib/nda";

interface NdaDocumentProps {
  data: NdaFormData;
}

function SignatureCell({ party }: { party: Party }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="border-b border-slate-400 pb-6" aria-hidden />
      <p className="text-xs uppercase tracking-wide text-slate-500">Signature</p>
      <dl className="space-y-1">
        <div>
          <dt className="inline text-slate-500">Print name: </dt>
          <dd className="inline text-slate-900">
            {orPlaceholder(party.printName, "Name")}
          </dd>
        </div>
        <div>
          <dt className="inline text-slate-500">Title: </dt>
          <dd className="inline text-slate-900">
            {orPlaceholder(party.title, "Title")}
          </dd>
        </div>
        <div>
          <dt className="inline text-slate-500">Company: </dt>
          <dd className="inline text-slate-900">
            {orPlaceholder(party.company, "Company")}
          </dd>
        </div>
        <div>
          <dt className="inline text-slate-500">Notice address: </dt>
          <dd className="inline text-slate-900">
            {orPlaceholder(party.noticeAddress, "Email or postal address")}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * The rendered Mutual NDA. This is the printable artifact: the print
 * stylesheet (globals.css) hides everything on the page except this element.
 */
export default function NdaDocument({ data }: NdaDocumentProps) {
  const effectiveDate = formatEffectiveDate(data.effectiveDate);

  return (
    <article
      id="nda-document"
      className="nda-document mx-auto max-w-[8.5in] space-y-6 bg-white p-10 text-slate-900"
    >
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Mutual Non-Disclosure Agreement</h1>
        <p className="text-sm text-slate-500">Cover Page</p>
      </header>

      <p className="text-sm leading-relaxed text-slate-700">
        This Mutual Non-Disclosure Agreement (the &ldquo;MNDA&rdquo;) consists of
        this Cover Page and the Common Paper Mutual NDA Standard Terms Version
        1.0 (&ldquo;Standard Terms&rdquo;). Any modifications of the Standard
        Terms are made on this Cover Page, which controls over conflicts with the
        Standard Terms.
      </p>

      <dl className="space-y-4 text-sm">
        <div>
          <dt className="font-semibold text-slate-900">Purpose</dt>
          <dd className="mt-1 text-slate-700">
            {orPlaceholder(data.purpose, "How Confidential Information may be used")}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Effective Date</dt>
          <dd className="mt-1 text-slate-700">{effectiveDate}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">MNDA Term</dt>
          <dd className="mt-1 text-slate-700">{describeNdaTerm(data)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Term of Confidentiality</dt>
          <dd className="mt-1 text-slate-700">{describeConfidentiality(data)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">
            Governing Law &amp; Jurisdiction
          </dt>
          <dd className="mt-1 space-y-0.5 text-slate-700">
            <p>Governing Law: {orPlaceholder(data.governingLaw, "State")}</p>
            <p>
              Jurisdiction:{" "}
              {orPlaceholder(data.jurisdiction, "City or county and state")}
            </p>
          </dd>
        </div>
        {data.modifications.trim() ? (
          <div>
            <dt className="font-semibold text-slate-900">MNDA Modifications</dt>
            <dd className="mt-1 whitespace-pre-line text-slate-700">
              {data.modifications.trim()}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          By signing this Cover Page, each party agrees to enter into this MNDA
          as of the Effective Date.
        </p>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <SignatureCell party={data.party1} />
          <SignatureCell party={data.party2} />
        </div>
      </div>

      <section className="nda-standard-terms space-y-4 border-t border-slate-300 pt-6">
        <h2 className="text-xl font-bold">Standard Terms</h2>
        <ol className="space-y-3 text-sm leading-relaxed text-slate-700">
          {STANDARD_TERMS.map((term, index) => (
            <li key={term.heading} className="flex gap-2">
              <span className="font-semibold text-slate-900">{index + 1}.</span>
              <span>
                <span className="font-semibold text-slate-900">
                  {term.heading}.{" "}
                </span>
                {term.body}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        {ATTRIBUTION}
      </footer>
    </article>
  );
}
