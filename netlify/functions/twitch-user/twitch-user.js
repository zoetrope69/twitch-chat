require("dotenv").config();

const fetch = (...args) => {
  return import("node-fetch").then(({ default: fetch }) => fetch(...args));
};

const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;
const SCOPES = ["user:read:email"];

async function getTwitchAuthToken() {
  const params = new URLSearchParams();
  params.set("client_id", TWITCH_CLIENT_ID);
  params.set("client_secret", TWITCH_CLIENT_SECRET);
  params.set("grant_type", "client_credentials");
  params.set("scope", SCOPES.join(" "));

  const url = new URL(`https://id.twitch.tv/oauth2/token?${params}`);

  const response = await fetch(url, {
    method: "POST",
  });

  const { access_token } = await response.json();

  if (!access_token) {
    throw new Error("Missing Twitch auth token.");
  }

  return access_token;
}

async function getTwitchUserId(authToken, username) {
  const url = new URL(`https://api.twitch.tv/helix/users?login=${username}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Client-Id": TWITCH_CLIENT_ID,
    },
  });

  const json = await response.json();

  if (!json || !json.data || json.data.length == 0) {
    throw new Error("Missing data from Twitch API");
  }

  if (!json.data[0].id) {
    throw new Error(`Couldnt get Twitch User ID for ${username}`);
  }

  return json.data[0].id;
}

const handler = async (event) => {
  try {
    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
      throw new Error("Missing environment variables");
    }

    if (!event.queryStringParameters.username) {
      throw new Error("Missing username query string");
    }

    const { username } = event.queryStringParameters;

    const authToken = await getTwitchAuthToken();
    const userId = await getTwitchUserId(authToken, username);

    return {
      statusCode: 200,
      body: JSON.stringify({ id: userId }),
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };
