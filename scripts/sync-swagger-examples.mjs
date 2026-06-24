import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = join(root, 'tests');
/** Simple Mode / chat — short description, auto-generated lyrics */
const PROMPT_SIMPLE =
  'A popular heavy metal song about war, sung by a deep-voiced male singer, slowly and melodiously. The lyrics depict the sorrow of people after the war.';

/** Custom Mode — full structured lyrics with section tags */
const PROMPT_CUSTOM = `[Verse 1]
Cruel flames of war engulf this land
Battlefields filled with death and dread
Innocent souls in darkness, they rest
My heart trembles in this silent test

[Verse 2]
People weep for loved ones lost
Battered bodies bear the cost
Seeking peace and hope once known
Our grief transforms to hearts of stone

[Chorus]
Silent battlegrounds, no birds' song
Shadows of war, where we don't belong
May flowers of peace bloom in this place
Let's guard this precious dream with grace

[Bridge]
Through the ashes, we will rise
Hand in hand, towards peaceful skies
No more sorrow, no more pain
Together, we'll break these chains

[Chorus]
Silent battlegrounds, no birds' song
Shadows of war, where we don't belong
May flowers of peace bloom in this place
Let's guard this precious dream with grace

[Outro]
In unity, our strength will grow
A brighter future, we'll soon know
From the ruins, hope will spring
A new dawn, we'll together bring`;

/** Extend audio — continuation lyrics in LRC-style tags */
const PROMPT_EXTEND = `[lrc]Silent battlegrounds, no birds' song
Shadows of war, where we don't belong
May flowers of peace bloom in this place
Let's guard this precious dream with grace
[endlrc]`;

/** Generate lyrics — theme / idea only */
const PROMPT_LYRICS = 'A soothing lullaby';

const MODEL = 'chirp-auk-turbo';

/** Load tests/{apiTail}-response.json keyed by API path tail (e.g. generate, get, get_limit). */
function loadTestResponses() {
  const map = {};
  for (const file of readdirSync(testsDir)) {
    const match = file.match(/^(.+)-response\.json$/);
    if (!match) continue;
    map[match[1]] = JSON.parse(readFileSync(join(testsDir, file), 'utf8'));
  }
  return map;
}

function testSource(tail) {
  return `tests/${tail}-response.json`;
}

const responses = loadTestResponses();
const generateResp = responses.generate;
const getResp = responses.get;
const getLimitResp = responses.get_limit;

if (!generateResp) throw new Error(`Missing ${testSource('generate')}`);
if (!getResp?.length) throw new Error(`Missing or empty ${testSource('get')}`);

const specPath = join(root, 'src/app/docs/swagger-suno-api.json');
const spec = JSON.parse(readFileSync(specPath, 'utf8'));

spec.paths['/api/generate'].post.description = spec.paths['/api/generate'].post.description.replace(
  /Defaults to `chirp-v3-5`/g,
  'Defaults to `chirp-auk-turbo`'
);

const model = spec.components.schemas.ModelName;
model.default = MODEL;
model.example = MODEL;
model.enum = ['chirp-auk-turbo', 'chirp-auk', 'chirp-v4', 'chirp-bluejay', 'chirp-crow', 'chirp-fenix'];
model.description =
  "Suno model version passed as the `mv` parameter to Suno's generation API.\n\nAvailable options:\n\n- **`chirp-auk-turbo`**: V4.5-all — **Free Plan default** (Best free model)\n- **`chirp-auk`**: V4.5 Pro — requires Pro/Premier subscription\n- **`chirp-v4`**: V4 Pro\n- **`chirp-bluejay`**: V4.5+ Pro\n- **`chirp-crow`**: V5 Pro\n- **`chirp-fenix`**: V5.5 Pro\n\nOmit this field to use the server default (`chirp-auk-turbo`). Use the model matching your Suno plan tier.";

const genReq = spec.components.schemas.GenerateRequest;
genReq.properties.prompt.example = PROMPT_SIMPLE;
genReq.example = { prompt: PROMPT_SIMPLE, make_instrumental: false, model: MODEL, wait_audio: false };

const customReq = spec.components.schemas.CustomGenerateRequest;
customReq.properties.prompt.example = PROMPT_CUSTOM;
customReq.example = {
  prompt: PROMPT_CUSTOM,
  tags: 'pop metal male melancholic',
  negative_tags: 'female edm techno',
  title: 'Silent Battlefield',
  make_instrumental: false,
  model: MODEL,
  wait_audio: false,
};

const extendReq = spec.components.schemas.ExtendAudioRequest;
extendReq.properties.audio_id.example = getResp[0].id;
extendReq.properties.prompt.example = PROMPT_EXTEND;
extendReq.example = {
  audio_id: getResp[0].id,
  prompt: PROMPT_EXTEND,
  continue_at: getResp[0].duration,
  title: 'Silent Battlefield (Extended)',
  tags: 'pop metal male melancholic',
  negative_tags: 'female edm techno',
  model: MODEL,
  wait_audio: false,
};

const lyricsReq = spec.components.schemas.GenerateLyricsRequest;
lyricsReq.properties.prompt.example = PROMPT_LYRICS;
lyricsReq.example = { prompt: PROMPT_LYRICS };

spec.paths['/api/get'].get.parameters[0].example = getResp.map((x) => x.id).join(',');

const chatReq = spec.components.schemas.ChatCompletionsRequest;
chatReq.properties.messages.items.properties.content.example = PROMPT_SIMPLE;
chatReq.example.messages[0].content = PROMPT_SIMPLE;

const sample = getResp[0];
const ai = spec.components.schemas.audio_info.properties;
ai.id.example = sample.id;
ai.title.example = sample.title;
ai.image_url.example = sample.image_url;
ai.audio_url.example = sample.audio_url;
ai.created_at.example = sample.created_at;
ai.model_name.example = sample.model_name;
ai.status.example = sample.status;
ai.duration.example = String(sample.duration);
ai.gpt_description_prompt.example = sample.gpt_description_prompt;
ai.type.example = sample.type;
ai.tags.example = sample.tags;

spec.components.responses.AudioInfoArray200.description =
  `Success — array of exactly 2 audio objects per generation request (async initial response).\n\nSource: \`${testSource('generate')}\`. When \`wait_audio\` is \`false\`, \`audio_url\` is usually empty and \`status\` is \`submitted\`; poll \`/api/get?ids=\` until \`streaming\` or \`complete\`.`;
spec.components.responses.AudioInfoArray200.content['application/json'].example = generateResp;

spec.components.responses.AudioInfo200.description =
  `Success — single audio object (complete state).\n\nSource: \`${testSource('get')}\` (first item).`;
spec.components.responses.AudioInfo200.content['application/json'].example = getResp[0];

spec.components.responses.AudioInfoGetArray200 = {
  description: `Success — audio metadata after polling (complete response).\n\nSource: \`${testSource('get')}\`.`,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/AudioInfoArray' },
      example: getResp,
    },
  },
};
spec.paths['/api/get'].get.responses['200'] = { $ref: '#/components/responses/AudioInfoGetArray200' };

if (getLimitResp) {
  spec.components.responses.Limit200.description =
    `Success — quota information.\n\nSource: \`${testSource('get_limit')}\`.`;
  spec.components.responses.Limit200.content['application/json'].example = getLimitResp;

  const limitSchema = spec.components.schemas.LimitResponse.properties;
  for (const key of Object.keys(limitSchema)) {
    if (getLimitResp[key] !== undefined) {
      limitSchema[key].example = getLimitResp[key];
    }
  }
}

writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
console.log('Updated src/app/docs/swagger-suno-api.json from tests/*-response.json');
