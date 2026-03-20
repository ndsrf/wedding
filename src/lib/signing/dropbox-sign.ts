import * as DropboxSign from '@dropbox/sign';

function getSignatureClient(): DropboxSign.SignatureRequestApi {
  const apiKey = process.env.DROPBOX_SIGN_API_KEY;
  if (!apiKey) throw new Error('DROPBOX_SIGN_API_KEY environment variable is not set');
  const client = new DropboxSign.SignatureRequestApi();
  client.username = apiKey;
  return client;
}

function getEmbeddedClient(): DropboxSign.EmbeddedApi {
  const apiKey = process.env.DROPBOX_SIGN_API_KEY;
  if (!apiKey) throw new Error('DROPBOX_SIGN_API_KEY environment variable is not set');
  const client = new DropboxSign.EmbeddedApi();
  client.username = apiKey;
  return client;
}

export interface SignatureRequestResult {
  signatureRequestId: string;
  signUrl?: string;
}

/**
 * Create a signature request using a public PDF URL.
 * Uses file_urls (simpler than uploading files directly) since the PDF is on Vercel Blob.
 */
export async function createSignatureRequest(params: {
  pdfUrl: string;
  signerEmail: string;
  signerName: string;
  title: string;
  message?: string;
}): Promise<SignatureRequestResult> {
  const clientId = process.env.DROPBOX_SIGN_CLIENT_ID;
  const useEmbedded = Boolean(clientId);

  const signers: DropboxSign.SubSignatureRequestSigner[] = [
    { emailAddress: params.signerEmail, name: params.signerName, order: 0 },
  ];

  const signatureClient = getSignatureClient();

  if (useEmbedded && clientId) {
    const requestData: DropboxSign.SignatureRequestCreateEmbeddedRequest = {
      clientId,
      title: params.title,
      message: params.message ?? `Please review and sign: ${params.title}`,
      signers,
      fileUrls: [params.pdfUrl],
    };

    const response = await signatureClient.signatureRequestCreateEmbedded(requestData);
    const signatureRequest = response.body.signatureRequest;
    if (!signatureRequest?.signatureRequestId) {
      throw new Error('No signature request ID returned from Dropbox Sign');
    }

    let signUrl: string | undefined;
    const signature = signatureRequest.signatures?.[0];
    if (signature?.signatureId) {
      const embeddedClient = getEmbeddedClient();
      const embeddedRes = await embeddedClient.embeddedSignUrl(signature.signatureId);
      signUrl = embeddedRes.body.embedded?.signUrl ?? undefined;
    }

    return { signatureRequestId: signatureRequest.signatureRequestId, signUrl };
  } else {
    const requestData: DropboxSign.SignatureRequestSendRequest = {
      title: params.title,
      message: params.message ?? `Please review and sign: ${params.title}`,
      signers,
      fileUrls: [params.pdfUrl],
    };

    const response = await signatureClient.signatureRequestSend(requestData);
    const signatureRequest = response.body.signatureRequest;
    if (!signatureRequest?.signatureRequestId) {
      throw new Error('No signature request ID returned from Dropbox Sign');
    }
    return { signatureRequestId: signatureRequest.signatureRequestId };
  }
}

/**
 * Get the download URL for a signed document.
 */
export async function getSignedPdfUrl(signatureRequestId: string): Promise<string | null> {
  try {
    const client = getSignatureClient();
    const response = await client.signatureRequestGet(signatureRequestId);
    return response.body.signatureRequest?.filesUrl ?? null;
  } catch {
    return null;
  }
}
