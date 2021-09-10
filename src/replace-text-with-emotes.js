import replaceAll from "replaceall";

let BETTER_TTV_EMOTES = null;

async function getBetterTTVEmotes(channelId) {
  if (!channelId) {
    return [];
  }

  const response = await fetch(
    `https://api.betterttv.net/3/cached/users/twitch/${channelId}`
  );
  const json = await response.json();

  if (!json.channelEmotes && !json.sharedEmotes) {
    return [];
  }

  return [...json.channelEmotes, ...json.sharedEmotes].map((emote) => ({
    type: "betterttv",
    id: emote.id,
    image: `https://cdn.betterttv.net/emote/${emote.id}/3x`,
    code: emote.code,
  }));
}

async function getCachedBetterTTVEmotes(channelId) {
  if (BETTER_TTV_EMOTES) {
    return BETTER_TTV_EMOTES;
  }

  BETTER_TTV_EMOTES = await getBetterTTVEmotes(channelId);

  return BETTER_TTV_EMOTES;
}

function getTwitchEmotes(text, emotes, channelId) {
  if (!emotes || Object.keys(emotes).length === 0) {
    return [];
  }

  const emotePositions = [];

  Object.keys(emotes).forEach((emoteId) => {
    const emoteStringPositions = emotes[emoteId];

    const [emoteStringPosition] = emoteStringPositions;

    if (typeof emoteStringPosition !== "string") {
      return;
    }

    const [emoteStartPositionString, emoteEndPositionString] =
      emoteStringPosition.split("-");
    const emoteStartPosition = parseInt(emoteStartPositionString, 10);
    const emoteEndPosition = parseInt(emoteEndPositionString, 10);

    const emoteText = text.substring(emoteStartPosition, emoteEndPosition + 1);

    emotePositions.push({
      type: "twitch",
      id: emoteId,
      image: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/3.0`,
      code: emoteText,
    });
  });

  return emotePositions;
}

function replaceEmotes(text, emotes) {
  if (!emotes || emotes.length === 0) {
    return text;
  }

  const textTokens = text.split(" ");

  const newTokens = textTokens.map((textToken) => {
    const emote = emotes.find(({ code }) => code === textToken);
    if (emote) {
      const { type, code, image } = emote;
      return `
        <img
          class="MessageTextEmote MessageTextEmote--${type}"
          src="${image}"
          alt="${code}"
          />
      `.trim();
    }

    return textToken;
  });

  return newTokens.join(" ").trim();
}

async function replaceTextWithEmotes(text, emoteDataFromTwitchBot, channelId) {
  if (!text || text.length === 0) {
    return "";
  }

  const betterTTVEmotes = await getCachedBetterTTVEmotes(channelId);
  const twitchEmotes = getTwitchEmotes(text, emoteDataFromTwitchBot);
  const emotes = [...twitchEmotes, ...betterTTVEmotes];

  return replaceEmotes(text, emotes);
}

export default replaceTextWithEmotes;
