# Slack Emoji Migration Tool
Simple script to help you import a slack emoji export into a new slack org.

Great for layoffs! :D jk <3

## Instructions
1. Unarchive your slack  in the root directory
1. Get an (unofficial) slack API token. You can do this by uploading a dummy emoji at https://<your_company>.slack.com/customize/emoji page and checking the network tab for a request to slack's emoji.add endpoint. You should see a token under the Form Data. Pop this token [here](https://github.com/kan-o-ash/slack-emoji-migration/blob/f39005f32479309d8750b21c30c5a0d32dd060fd/import-emojis.js#L13)
1. Put your slack org's name [here](https://github.com/kan-o-ash/slack-emoji-migration/blob/f39005f32479309d8750b21c30c5a0d32dd060fd/import-emojis.js#L13). i.e. if your slack is on https://company.slack.com, you should put in 'company'.
1. run `node import-emojis.js` and enjoy! Requests happen one at a time (to avoid ratelimits) so it might take a while.
