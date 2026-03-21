const DEFAULT_API_URL = 'https://api.docuseal.com';

function getApiBase(): string {
  return (process.env.DOCUSEAL_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
}

function getApiKey(): string {
  const key = process.env.DOCUSEAL_API_KEY;
  if (!key) throw new Error('DOCUSEAL_API_KEY environment variable is not set');
  return key;
}

function headers(): Record<string, string> {
  return {
    'X-Auth-Token': getApiKey(),
    'Content-Type': 'application/json',
  };
}

export interface DocuSealSubmissionResult {
  templateId: number;
  submissionId: number;
  submitterId: number;
  /** Slug for the public signing page: https://docuseal.com/s/{slug} */
  slug: string;
  /** URL to embed the signing widget in an iframe */
  embedSrc: string;
}

/**
 * Create a DocuSeal template from a PDF URL, then immediately create a submission.
 * The signature field is placed on the given signaturePage (0-indexed).
 */
export async function createDocuSealSubmission(params: {
  pdfUrl: string;
  title: string;
  signerEmail: string;
  signerName: string;
  /** 0-indexed page number where the signature field should appear (last page of the PDF) */
  signaturePage: number;
}): Promise<DocuSealSubmissionResult> {
  const base = getApiBase();
  const hdrs = headers();

  // Step 1: Create a one-time template from the PDF, with signature field defined
  const templateBody = {
    name: params.title,
    documents: [{ name: `${params.title}.pdf`, url: params.pdfUrl }],
    submitters: [{ name: 'Client' }],
    fields: [
      {
        name: 'Signature',
        type: 'signature',
        role: 'Client',
        required: true,
        areas: [
          // Right half of the page, in the client signature block area
          { x: 0.52, y: 0.25, w: 0.38, h: 0.1, page: params.signaturePage },
        ],
      },
      {
        name: 'Date',
        type: 'date',
        role: 'Client',
        required: false,
        areas: [
          { x: 0.52, y: 0.37, w: 0.25, h: 0.05, page: params.signaturePage },
        ],
      },
    ],
  };

  const templateRes = await fetch(`${base}/templates/pdf`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify(templateBody),
  });

  if (!templateRes.ok) {
    const text = await templateRes.text();
    throw new Error(`DocuSeal template creation failed (${templateRes.status}): ${text}`);
  }

  const template = await templateRes.json() as { id: number };
  const templateId = template.id;

  // Step 2: Create a submission from the template
  const submissionRes = await fetch(`${base}/submissions`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify({
      template_id: templateId,
      send_email: false,
      submitters: [
        { role: 'Client', email: params.signerEmail, name: params.signerName },
      ],
    }),
  });

  if (!submissionRes.ok) {
    const text = await submissionRes.text();
    throw new Error(`DocuSeal submission creation failed (${submissionRes.status}): ${text}`);
  }

  // The /submissions endpoint always returns an array of submitters (one per role)
  const submitters = await submissionRes.json() as Array<{
    id: number;
    submission_id: number;
    slug: string;
    embed_src: string;
  }>;

  const submitter = submitters[0];

  return {
    templateId,
    submissionId: submitter.submission_id,
    submitterId: submitter.id,
    slug: submitter.slug,
    embedSrc: submitter.embed_src,
  };
}
