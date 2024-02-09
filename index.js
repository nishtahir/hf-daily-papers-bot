import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as crypto from "crypto";

const AP_ACCESS_TOKEN = process.env.AP_ACCESS_TOKEN;
const AP_URL = process.env.AP_URL;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const promptTemplate = `Summarize this as a tweet including relevant hashtags
---
{%abstract%}
`;

const postTemplate = `{%summary%}
{%url%}
`;

function createDailyPapersUrl(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  return `https://huggingface.co/api/daily_papers?date=${year}-${month}-${day}`;
}

async function summarizePaper(content) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = promptTemplate.replace("{%abstract%}", content);
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function downloadMedia(url) {
  const response = await fetch(url);
  const imageBuffer = await response.arrayBuffer();
  return imageBuffer;
}

async function uploadMedia(fileBuffer, mimeType) {
  const form = new FormData();
  form.append("file", new Blob([fileBuffer]), {
    filename: crypto.randomBytes(16).toString("hex"),
    contentType: mimeType,
  });

  const response = await fetch(`${AP_URL}/api/v1/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AP_ACCESS_TOKEN}`,
    },
    body: form,
  });

  const mediaData = await response.json();
  return mediaData.id;
}

async function postStatus({ summary, url, attachments }) {
  const postBody = postTemplate
    .replace("{%summary%}", summary)
    .replace("{%url%}", url);

  const postData = new FormData();
  postData.append("status", postBody);

  for (const attachment of attachments) {
    postData.append("media_ids[]", attachment);
  }

  await fetch(`${AP_URL}/api/v1/statuses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AP_ACCESS_TOKEN}`,
    },
    body: postData,
  });
}

function parseMimeType(url) {
  if (url.endsWith(".png")) {
    return "image/png";
  } else if (url.endsWith(".jpg") || url.endsWith("jpeg")) {
    return "image/jpeg";
  } else if (url.endsWith(".gif")) {
    return "image/gif";
  } else if (url.endsWith(".mp4")) {
    return "video/mp4";
  }
}

async function fetchRecentPosts(limit = 30) {
  const verifyResponse = await fetch(
    `${AP_URL}/api/v1/accounts/verify_credentials`,
    {
      headers: {
        Authorization: `Bearer ${AP_ACCESS_TOKEN}`,
      },
    }
  );
  const userData = await verifyResponse.json();

  const postsResponse = await fetch(
    `${AP_URL}/api/v1/accounts/${userData.id}/statuses?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${AP_ACCESS_TOKEN}`,
      },
    }
  );
  return await postsResponse.json();
}

async function main() {
  const recentPosts = await fetchRecentPosts();
  const recentPostsContent = recentPosts.map((post) => post.text);
  const url = createDailyPapersUrl();
  console.log(`Fetching papers for ${url}`);

  const response = await fetch(url);
  const items = await response.json();
  console.log(`Found ${items.length} papers...`);

  for (const item of items) {
    const paper = item.paper;
    if (!paper) {
      console.log(`No paper found for ${JSON.stringify(item)}`);
      continue;
    }

    const paperUrl = `https://huggingface.co/papers/${paper.id}`;
    const existingPostForPaper = recentPostsContent.find((content) =>
      content.includes(paperUrl)
    );
    if (existingPostForPaper) {
      console.log(`Skipping ${paper.id} as a recent dupe`);
      continue;
    }
    console.log(`Generating post for ${paperUrl}`);

    const mediaIds = [];
    const mediaUrl = item.mediaUrl;

    if (mediaUrl) {
      const mimeType = parseMimeType(mediaUrl);
      if (mimeType) {
        const buffer = await downloadMedia(item.mediaUrl);
        const mediaId = await uploadMedia(buffer, mimeType);
        mediaIds.push(mediaId);
      }
    }

    const summary = await summarizePaper(paper.title);
    postStatus({
      summary,
      url: paperUrl,
      attachments: mediaIds,
    });
  }
}

main();
