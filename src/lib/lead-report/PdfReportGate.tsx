import React, { useState } from "react";
import { generateReportPdf, downloadPdf, type ReportSnapshot } from "./pdf";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PdfReportGateProps = {
  /** Must match the hidden static Netlify form rendered on the page (see docs/tz-speed-calc-email-gate.md §3). */
  formName: string;
  /** Builds the report snapshot from the caller's current state, called at submit time. */
  buildSnapshot: () => ReportSnapshot;
  /** Returns elements (e.g. chart containers) to screenshot into the PDF, in order. Called at submit time. */
  getChartEls?: () => Element[];
  /** Download filename for the generated PDF. */
  filename: string;
  buttonLabel?: string;
};

/**
 * Two-tier ungating building block: a "Get the PDF report" toggle + inline
 * email-gate form (Netlify Forms + honeypot) that generates and downloads a
 * client-side PDF on success. Shared across all calculator tools so each one
 * only needs to supply a formName, a snapshot builder and chart elements.
 */
export function PdfReportGate({
  formName,
  buildSnapshot,
  getChartEls,
  filename,
  buttonLabel = "⬇ Get the PDF report",
}: PdfReportGateProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [botField, setBotField] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (botField) {
      // Honeypot tripped — pretend success, drop silently.
      setSent(true);
      return;
    }
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = new URLSearchParams({
        "form-name": formName,
        name: name.trim(),
        email: trimmedEmail,
        "marketing-consent": marketingConsent ? "yes" : "no",
        "bot-field": botField,
      });
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error("Submission failed.");
      setSent(true);
      const bytes = await generateReportPdf(buildSnapshot(), getChartEls ? getChartEls() : []);
      downloadPdf(bytes, filename);
    } catch {
      setError("Couldn't submit right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button type="button" className="calc-share__btn" onClick={() => setOpen((v) => !v)}>
        {buttonLabel}
      </button>
      {open && (
        <div className="calc-gate">
          {sent ? (
            <p className="calc-gate__ok">✓ Your PDF report is downloading now.</p>
          ) : (
            <form className="contact-form calc-gate__form" onSubmit={submit}>
              <p className="hp">
                <label>
                  Leave this empty: <input value={botField} onChange={(e) => setBotField(e.target.value)} />
                </label>
              </p>
              <div className="field">
                <label htmlFor={`${formName}-name`}>Name</label>
                <input
                  id={`${formName}-name`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="field">
                <label htmlFor={`${formName}-email`}>Email</label>
                <input
                  id={`${formName}-email`}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <label className="calc-check calc-gate__consent">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                />
                I'd like occasional emails with speed tips and offers from CommerceLead. (Optional — you'll get the PDF either way.)
              </label>
              {error && <p className="calc-hint calc-hint--err">{error}</p>}
              <button type="submit" className="btn btn--solid" disabled={submitting}>
                {submitting ? "Sending…" : buttonLabel.replace(/^⬇\s*/, "")}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
