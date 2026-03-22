const DEFAULT_API_URL = 'https://api.docuseal.com';

function getApiBase(): string {
  return (process.env.DOCUSEAL_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
}

function getApiKey(): string {
  const key = process.env.DOCUSEAL_API_KEY;
  if (!key) throw new Error('DOCUSEAL_API_KEY environment variable is not set');
  return key;
}

function logDocuSeal(message: string, data?: unknown) {
  const prefix = '[DocuSeal]';
  if (data !== undefined) {
    console.log(prefix, message, JSON.stringify(data, null, 2));
  } else {
    console.log(prefix, message);
  }
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
 * Create a DocuSeal template from a PDF buffer (base64-encoded), then immediately
 * create a submission. The signature field is placed on the given signaturePage (0-indexed).
 */
export async function createDocuSealSubmission(params: {
  pdfBuffer: Buffer;
  title: string;
  signerEmail: string;
  signerName: string;
  /** 0-indexed page number where the signature field should appear (last page of the PDF) */
  signaturePage: number;
}): Promise<DocuSealSubmissionResult> {
  const base = getApiBase();
  const hdrs = headers();
  const apiKey = getApiKey();

  logDocuSeal('Starting submission creation', {
    apiBase: base,
    apiKeySet: !!apiKey,
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.slice(0, 8) + '...',
    title: params.title,
    pdfBufferBytes: params.pdfBuffer.length,
    signaturePage: params.signaturePage,
    signerEmail: params.signerEmail,
    signerName: params.signerName,
  });

  // Step 1: Create a one-time template from the PDF, with signature field defined
  // Use Buffer.from() to handle both Buffer and Uint8Array returns from renderToBuffer.
  // DocuSeal requires a data URI for the file field, not raw base64.
  const rawBuffer = Buffer.from(params.pdfBuffer);
  if (rawBuffer.length === 0) {
    throw new Error('PDF buffer is empty — cannot send to DocuSeal');
  }
  const fileDataUri = `data:application/pdf;base64,${rawBuffer.toString('base64')}`;
  logDocuSeal('PDF buffer info', {
    inputType: Object.prototype.toString.call(params.pdfBuffer),
    byteLength: rawBuffer.length,
    dataUriLength: fileDataUri.length,
    dataUriPrefix: fileDataUri.slice(0, 40),
  });

  const templateBody = {
    name: params.title,
    documents: [
      {
        name: `${params.title}.pdf`,
        file: fileDataUri,
      },
    ],
    submitters: [
      {
        name: 'Client',
        fields: [
          {
            name: 'Signature',
            type: 'signature',
            required: true,
            areas: [
              { x: 0.52, y: 0.25, w: 0.38, h: 0.1, page: params.signaturePage },
            ],
          },
          {
            name: 'Date',
            type: 'date',
            required: false,
            areas: [
              { x: 0.52, y: 0.37, w: 0.25, h: 0.05, page: params.signaturePage },
            ],
          },
        ],
      },
    ],
  };

  const submitter0 = templateBody.submitters[0];
  logDocuSeal('POST /templates/pdf', {
    url: `${base}/templates/pdf`,
    document: {
      name: templateBody.documents[0].name,
      fileSet: !!templateBody.documents[0].file,
      fileLength: templateBody.documents[0].file.length,
      filePrefix: templateBody.documents[0].file.slice(0, 40),
    },
    submitter: {
      name: submitter0.name,
      fieldCount: submitter0.fields.length,
      fieldNames: submitter0.fields.map((f) => f.name),
    },
  });

  const templateRes = await fetch(`${base}/templates/pdf`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify(templateBody),
  });

  logDocuSeal('Template response', { status: templateRes.status, ok: templateRes.ok });

  if (!templateRes.ok) {
    const text = await templateRes.text();
    logDocuSeal('Template creation FAILED', { status: templateRes.status, body: text });
    throw new Error(`DocuSeal template creation failed (${templateRes.status}): ${text}`);
  }

  const template = await templateRes.json() as { id: number };
  const templateId = template.id;
  logDocuSeal('Template created', { templateId });

  // Step 2: Create a submission from the template
  const submissionBody = {
    template_id: templateId,
    send_email: false,
    submitters: [
      { role: 'Client', email: params.signerEmail, name: params.signerName },
    ],
  };

  logDocuSeal('POST /submissions', { url: `${base}/submissions`, body: submissionBody });

  const submissionRes = await fetch(`${base}/submissions`, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify(submissionBody),
  });

  logDocuSeal('Submission response', { status: submissionRes.status, ok: submissionRes.ok });

  if (!submissionRes.ok) {
    const text = await submissionRes.text();
    logDocuSeal('Submission creation FAILED', { status: submissionRes.status, body: text });
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
  logDocuSeal('Submission created successfully', {
    submissionId: submitter.submission_id,
    submitterId: submitter.id,
    slug: submitter.slug,
    embedSrcSet: !!submitter.embed_src,
  });

  return {
    templateId,
    submissionId: submitter.submission_id,
    submitterId: submitter.id,
    slug: submitter.slug,
    embedSrc: submitter.embed_src,
  };
}
