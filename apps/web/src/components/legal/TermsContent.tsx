import {
  TERMS_CLOSING,
  TERMS_INTRO,
  TERMS_META,
  TERMS_SECTIONS,
  type TermsSection,
} from "@/lib/legal/terms-sections";

function TermsList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2 text-muted text-sm leading-relaxed">
      {items.map((item) => (
        <li key={item.slice(0, 48)}>{item}</li>
      ))}
    </ul>
  );
}

function TermsBlock({
  paragraphs,
  list,
}: {
  paragraphs?: string[];
  list?: string[];
}) {
  return (
    <>
      {paragraphs?.map((p) => (
        <p key={p.slice(0, 48)} className="text-muted text-sm leading-relaxed">
          {p}
        </p>
      ))}
      {list?.length ? <TermsList items={list} /> : null}
    </>
  );
}

function TermsSectionBlock({ section }: { section: TermsSection }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-surface">{section.title}</h2>
      <TermsBlock paragraphs={section.paragraphs} list={section.list} />
      {section.subsections?.map((sub) => (
        <div key={sub.title} className="space-y-2 pl-0 sm:pl-2">
          <h3 className="text-sm font-semibold text-surface">{sub.title}</h3>
          <TermsBlock paragraphs={sub.paragraphs} list={sub.list} />
        </div>
      ))}
    </section>
  );
}

export default function TermsContent() {
  return (
    <article className="space-y-8">
      <header className="space-y-3 border-b border-muted/20 pb-6">
        <p className="text-sm font-medium text-accent">{TERMS_META.product}</p>
        <h1 className="text-2xl font-bold text-surface">
          Terms and Conditions of Use
        </h1>
        <p className="text-sm text-muted">
          A Product of {TERMS_META.company}
        </p>
        <p className="text-xs text-muted">
          Effective Date: {TERMS_META.effectiveDate}
          <span className="mx-2">·</span>
          Last Updated: {TERMS_META.lastUpdated}
        </p>
        <p className="text-xs text-muted">
          <a
            href={TERMS_META.website}
            className="text-accent hover:underline"
            rel="noopener noreferrer"
          >
            {TERMS_META.website}
          </a>
        </p>
        <p className="text-muted text-sm leading-relaxed pt-2">{TERMS_INTRO}</p>
      </header>

      {TERMS_SECTIONS.map((section) => (
        <TermsSectionBlock key={section.title} section={section} />
      ))}

      <p className="text-sm text-muted border-t border-muted/20 pt-6 leading-relaxed">
        {TERMS_CLOSING}
      </p>
    </article>
  );
}
