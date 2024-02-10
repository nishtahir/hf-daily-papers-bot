import { GoogleGenerativeAI } from '@google/generative-ai';

const SUMMARIZE_PROMPT_TEMPLATE = `Summarize this as a tweet including relevant hashtags
---
{%abstract%}
`;
const CAPTION_PROMPT_TEMPLATE = 'Write a caption for this image';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export async function summarizePaper(content) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const prompt = SUMMARIZE_PROMPT_TEMPLATE.replace('{%abstract%}', content);
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function captionImage(arrayBuffer, mimeType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
  const buffer = Buffer.from(arrayBuffer);
  const result = await model.generateContent([CAPTION_PROMPT_TEMPLATE, {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  }]);
  return result.response.text();
}
