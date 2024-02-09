# hf-daily-papers-bot

An Mastodon/Activity Pub bot to keep up with [HF Daily Papers](https://huggingface.co/papers). Currently publishing daily at [@hfdailypapers@social.nishtahir.com](https://social.nishtahir.com/@hfdailypapers)

## Requirements
* NodeJS
* An ActivityPub/Mastodon compatible server (I use GotoSocial)

## Usage
The following environment variables need to be set see `.env.sample`

* `GOOGLE_GENERATIVE_AI_API_KEY` - Google Gemini LLM Api Key. It's used to summarize the abstracts
* `AP_ACCESS_TOKEN` - An access token for your activity pub user
* `AP_URL` - base URL for your activity pub server

To run the application, 

```
node index.js
```
