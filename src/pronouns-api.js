// store the pronouns in global variable norty
let AVAILABLE_PRONOUNS = null;
const USERS = []

const BASE_URL = `https://pronouns.alejo.io/api/`;

async function get(endpoint) {
	const response = await fetch(`${BASE_URL}${endpoint}`);
	return response.json();
}

async function saveAvailablePronouns() {
  const response = await get('pronouns');
  
  AVAILABLE_PRONOUNS = {};
  response.forEach(pronoun => {
    AVAILABLE_PRONOUNS[pronoun.name] = pronoun.display;
  });
  
  return Promise.resolve();
}
	
export async function getUserPronouns(username) {
  if (!AVAILABLE_PRONOUNS) {
    await saveAvailablePronouns();
  }
  
  const existingUser = USERS.find(user => user.username === username)
  if (existingUser) {
    return existingUser.pronouns;
  }
  
  if (username.length < 1) {
		return;
	}
  
  const response = await get(`users/${username}`);
  const userData = response.find((user) => {
		return user.login.toLowerCase() === username.toLowerCase();
	})

	if (!userData || !userData.pronoun_id) {
		return;
	}
  
  const pronouns = AVAILABLE_PRONOUNS[userData.pronoun_id];
  
  USERS.push({
    username,
    pronouns
  })
  
  return pronouns;
}
