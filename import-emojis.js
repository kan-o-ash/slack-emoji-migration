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


const uploadEmoji = async (emojiName, isAlias, filePath, fileName) => {
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

        if (isAlias)
            console.log(`[${fileName}] Upload ALIAS :${emojiName}: -> :${aliasFor}: | Response status: ${response.status} | Response Body: `, responseJson);
        else
            console.log(`[${fileName}] Upload EMOJI: :${emojiName}: | Response status: ${response.status} | Response Body: `, responseJson);
    }
    catch (e) {
        console.error('Error', e);
    }
}


(async () => {
    const fileNames = await fs.promises.readdir(emojiDir);
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

        const isAlias = fileName.includes('.alias');
        if (isAlias) {
            aliases.push({emojiName, filePath, fileName});
        } else 
            await uploadEmoji(emojiName, false, filePath, fileName);
    }
    for (const alias of aliases) {
        await uploadEmoji(alias.emojiName, true, alias.filePath, alias.fileName);
    }
})();
