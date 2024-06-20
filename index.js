import 'dotenv/config';
import { postStatus, uploadMedia, fetchRecentPosts } from './activity-pub.js';
import { summarizePaper, captionImage } from './gemini.js';
import { fetchDailyPapers } from './hugging-face.js';

const POST_TEMPLATE = `{%summary%}
{%url%}
`;

async function downloadMedia(url) {
  const response = await fetch(url);
  const imageBuffer = await response.arrayBuffer();
  return imageBuffer;
}

function parseMimeType(url) {
  if (!url) {
    return null;
  }

  // get the file extension
  const fileExtension = url.split('.').pop();
  if (!fileExtension) {
    return null;
  }

  switch (fileExtension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'mp4':
      return 'video/mp4';
    default:
      return null;
  }
}

function mimeTypeIsImage(mimeType) {
  return mimeType.startsWith('image/');
}

async function handleMedia(mediaUrl) {
  const mediaIds = [];
  const mimeType = parseMimeType(mediaUrl);
  if (mimeType) {
    const buffer = await downloadMedia(mediaUrl);
    let caption = null;
    try {
      if (mimeTypeIsImage(mimeType)) {
        caption = await captionImage(buffer, mimeType);
      }
    } catch (error) {
      // If we fail to caption the media, don't fail the entire post
      // eslint-disable-next-line no-console
      console.error(`Failed to caption media: ${error.message}`);
    }
    try {
      const mediaId = await uploadMedia({ buffer, mimeType, description: caption });
      mediaIds.push(mediaId);
    } catch (error) {
      // If we fail to upload the media, don't fail the entire post
      // eslint-disable-next-line no-console
      console.error(`Failed to upload media: ${error.message}`);
    }
  }
  return mediaIds;
}

async function fetchNewPapers(date) {
  const items = await fetchDailyPapers(date);
  const recentPosts = await fetchRecentPosts();
  // We only want to post papers that haven't been posted before
  // We can check this by checking to see if the paper URL appears in any of the recent posts
  const recentPostsContent = recentPosts.map((post) => post.text).join(' ');
  return items.filter((item) => !recentPostsContent.includes(item.paperUrl));
}

async function main() {
  /* eslint-disable no-await-in-loop, no-console */
  const date = new Date();
  console.log(`Fetching papers for ${date.toISOString()}...`);

  const papers = await fetchNewPapers(date);
  console.log(`Found ${papers.length} new papers...`);

  for (let i = 0; i < papers.length; i += 1) {
    const { paper, paperUrl, mediaUrl } = papers[i];
    console.log(`${i + 1} of ${papers.length}: Creating post for ${paperUrl}...`);

    console.log('Uploading media...');
    const mediaIds = await handleMedia(mediaUrl);

    console.log('Summarizing paper...');
    const summary = await summarizePaper(paper.summary);

    const postBody = POST_TEMPLATE
      .replace('{%summary%}', summary)
      .replace('{%url%}', paperUrl);

    console.log('Posting status...');
    const res = await postStatus({ status: postBody, attachments: mediaIds });
    console.log(`Status: ${res.status} ${res.statusText}`);
    /* eslint-enable no-await-in-loop, no-console */
  }
}

main();
