//jshint esversion:8
//jshint node:true

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');


// Slack export is a .tgz file, after you unarchive it it should result in a data/ directory containing the emojis and aliases
const emojiDir = './data/';  // Unarchived directory containing slack emojis here
const SLACK_ORG = '';  // Your slack org name here  (if your slack org is https://company.slack.com), type 'company'
const TOKEN = '';  // Your unofficial slack API token here

let RATELIMIT_MS = 500;


const uploadEmoji = async (emojiName, isAlias, filePath, fileName) => {
    await new Promise(r => setTimeout(r, RATELIMIT_MS));
    let aliasFor;

    const formData = new FormData();
    formData.append('name', emojiName);
    formData.append('mode', isAlias ? 'alias' : 'data');
    formData.append('_x_reason', 'customize-emoji-add');
    formData.append('_x_mode', 'online');

    if (isAlias) {
        const fileContents = await fs.promises.readFile(filePath, {'encoding': 'utf8'});
        if (!fileContents.includes('alias:')) {
            console.log(`${fileName} alias file malformed. File contents: ${fileContents}`);
            return;
        }
        aliasFor = fileContents.substring(6).split('\n')[0];
        formData.append('alias_for', aliasFor)
    }
    else {
        formData.append('image', fs.createReadStream(filePath));
    }

    try {
        const response = await fetch(`https://${SLACK_ORG}.slack.com/api/emoji.add`, {
          'headers': {
            'authorization': `Bearer ${TOKEN}`,
            'content-type': 'multipart/form-data',
             ...formData.getHeaders()
          },
          'body': formData,
          'method': 'POST',
        });
        const responseJson = await response.json();

        const success = (responseJson.ok || responseJson.error === 'error_name_taken')

        if (success) fs.appendFileSync('./output.txt', `${emojiName}\n`);

        if (isAlias)
            console.log(`[${fileName}] Upload ALIAS :${emojiName}: -> :${aliasFor}: | Success: ${success} | Response status: ${response.status} | Response Body: `, responseJson);
        else
            console.log(`[${fileName}] Upload EMOJI: :${emojiName}: | Success: ${success} | Response status: ${response.status} | Response Body: `, responseJson);

        if (response.status == 429) {
            RATELIMIT_MS = RATELIMIT_MS + 100;
            console.log(`Got ratelimited, new limit: ${RATELIMIT_MS}`);
            return false;
        } else {
            RATELIMIT_MS = Math.max(RATELIMIT_MS - 5, 0);
            return true;
        }
    }
    catch (e) {
        console.error('Error', e);
        return false;
    }
}


const retryUploadEmoji = async (emojiName, isAlias, filePath, fileName) => {
    let result;
    let i = 0;
    do {
        result = await uploadEmoji(emojiName, isAlias, filePath, fileName);
        i++;
    } while (!result && i < 5)

    if (!result) {
        console.log(`${fileName} failed after 5 tries`);
    }
    return;
}


(async () => {
    const fileNames = await fs.promises.readdir(emojiDir);
    const emojiToSkipContents = await fs.promises.readFile('./output.txt', {'encoding': 'utf8'});
    const emojiToSkip = new Set(emojiToSkipContents.split('\n'));
    console.log('Skipping these emojis: ', emojiToSkip);
    let aliases = [];

    for (const fileName of fileNames) {
        const filePath = path.join(emojiDir, fileName);
        const stat = await fs.promises.stat(filePath);
        const splitFileName = fileName.split('.');

        if (fileName === '.DS_Store') {
            continue;
        } else if (stat.isDirectory()) {
            console.log(`Skipping - '${fileName}' is a directory.`);
            continue;
        } else if (splitFileName.length != 2) {
            console.log(`Skipping - ${fileName} has ${splitFileName.length - 1} periods. Each file should have exactly one period (to denote file extension)`);
            continue;
        }

        const emojiName = splitFileName[0];

        if (emojiToSkip.has(emojiName)) {
            console.log(`Skipping - ${emojiName}`);
            continue;
        }

        const isAlias = fileName.includes('.alias');
        if (isAlias) {
            aliases.push({emojiName, filePath, fileName});
        } else 
            await retryUploadEmoji(emojiName, false, filePath, fileName);
    }
    for (const alias of aliases) {
        await retryUploadEmoji(alias.emojiName, true, alias.filePath, alias.fileName);
    }
})();
