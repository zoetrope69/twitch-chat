/* global tmi */
import "./lib/tmi.min.js";
// we'd normally do a import tmi.js from 'tmi.js' but we want the clientside version

export default class TwitchChat {
  constructor(channel, setErrorMessage) {
    this.channel = channel;

    this.connectClient(setErrorMessage);
  }

  connectClient(setErrorMessage) {
    if (!this.channel || this.client) {
      return;
    }

    this.client = new tmi.Client({
      options: {
        messagesLogLevel: "info",
      },
      channels: [this.channel],
      logger: {
        info: (message) => console.info(message), // eslint-disable-line no-console
        warn: (message) => console.warn(message), // eslint-disable-line no-console
        error: (message) => setErrorMessage(message),
      },
    });

    this.client.connect();
  }
}
