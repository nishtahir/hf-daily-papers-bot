import crypto from 'crypto';

const { AP_ACCESS_TOKEN, AP_URL } = process.env;

export async function fetchRecentPosts({
  baseUrl = AP_URL,
  accessToken = AP_ACCESS_TOKEN,
  limit = 30,
} = {}) {
  const verifyResponse = await fetch(
    `${baseUrl}/api/v1/accounts/verify_credentials`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const userData = await verifyResponse.json();

  const postsResponse = await fetch(
    `${baseUrl}/api/v1/accounts/${userData.id}/statuses?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return postsResponse.json();
}

export async function uploadMedia({
  baseUrl = AP_URL,
  accessToken = AP_ACCESS_TOKEN,
  filename = crypto.randomBytes(16).toString('hex'),
  buffer,
  mimeType,
  description,
}) {
  const form = new FormData();
  if (description) {
    form.append('description', description);
  }
  form.append('file', new Blob([buffer]), {
    filename,
    contentType: mimeType,
  });

  const response = await fetch(`${baseUrl}/api/v1/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  const mediaData = await response.json();
  return mediaData.id;
}

export async function postStatus({
  baseUrl = AP_URL,
  accessToken = AP_ACCESS_TOKEN,
  status,
  attachments,
  visibility = 'public',
}) {
  const postData = new FormData();
  postData.append('status', status);
  postData.append('visibility', visibility);

  for (let i = 0; i < attachments.length; i += 1) {
    postData.append('media_ids[]', attachments[i]);
  }

  await fetch(`${baseUrl}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: postData,
  });
}
