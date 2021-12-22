// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useRef } from "react";
import { VariableSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { Router } from "wouter";

import { getUserPronouns } from "./pronouns-api";
import TwitchChat from "./twitch-chat";
import replaceTextWithEmotes from "./replace-text-with-emotes";

import "./styles.css";

const MIN_ROW_HEIGHT = 50;
const ROW_SPACING = 5;

// Home function that is reflected across the site
export default function Home() {
  const listRef = useRef({});
  const rowHeights = useRef({});

  const [isConnecting, setIsConnecting] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [hiddenUsers, setHiddenUsers] = useState([]);
  const [channel, setChannel] = useState({});
  const [chatMessages, setChatMessages] = useState([]);

  const hasErrorMessage = errorMessage.length !== 0;

  // on load
  useEffect(() => {
    getParamVariables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (channel.name) {
      initialiseChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
    // eslint-disable-next-line
  }, [chatMessages]);

  function getRowHeight(index) {
    return rowHeights.current[index] + ROW_SPACING || MIN_ROW_HEIGHT;
  }

  function setRowHeight(index, size) {
    listRef.current.resetAfterIndex(0);
    rowHeights.current = { ...rowHeights.current, [index]: size };
  }

  function scrollToBottom() {
    listRef.current.scrollToItem(chatMessages.length - 1, "end");
  }

  function removeMessageFromChatMessage(id) {
    setChatMessages((previousChatMessages) => {
      return previousChatMessages.filter((message) => message.id !== id);
    });
  }

  function removeUserFromChatMessages(username) {
    setChatMessages((previousChatMessages) => {
      return previousChatMessages.filter((message) => {
        return message.user.username.toLowerCase() !== username.toLowerCase();
      });
    });
  }

  function addMessageToChatMessage(chatMessage) {
    setChatMessages((previousChatMessages) => {
      return [...previousChatMessages, chatMessage];
    });
  }

  /*
    colors we don't need to change:
      Coral, Yellow Green, Orange Red,
      Goldenrod, Cadet Blue, Dodger Blue,
      Hot Pink, Spring Green
  */
  const DARK_MODE_READABLE_COLOR_MAP = {
    "#FF0000": "#FF5858", // Red
    "#0000FF": "#7878FF", // Blue
    "#008000": "#00E700", // Green
    "#B22222": "#E05B5B", // Firebrick
    "#2E8B57": "#3DB974", // Sea Green
    "#D2691E": "#E1762A", // Chocolate
    "#8A2BE2": "#CF9AFF", // Blue Violet
  };

  function getColor(color) {
    if (!color) {
      return "white";
    }

    const readableColor = DARK_MODE_READABLE_COLOR_MAP[color.toUpperCase()];
    if (readableColor) {
      return readableColor;
    }

    return color;
  }

  async function handleChatMessage(_channel, data, message) {
    const { id, color, emotes } = data;
    const username = data["display-name"];

    if (hiddenUsers.includes(username)) {
      return;
    }

    if (!channel.id && username === channel.name) {
      const userId = data["user-id"];
      setErrorMessage(
        `New URL is: https://basic-obs-twitch-chat.glitch.me/?channelName=${channel.name}&channelId=${userId}`
      );
    }

    let pronouns;
    try {
      pronouns = await getUserPronouns(username);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }

    const textWithEmotes = await replaceTextWithEmotes(
      message,
      emotes,
      channel.id
    );

    addMessageToChatMessage({
      id,
      user: {
        color: getColor(color),
        username,
        pronouns,
      },
      text: textWithEmotes,
    });
  }

  function handleDeletedMessage(_channel, _username, _deletedMessage, data) {
    const id = data["target-msg-id"];
    removeMessageFromChatMessage(id);
  }

  function handleRemovedUser(_channel, username) {
    removeUserFromChatMessages(username);
  }

  function initialiseChat() {
    if (!isConnecting) {
      return;
    }

    const twitchChat = new TwitchChat(channel.name, setErrorMessage);

    twitchChat.client.on("error", (e) => {
      setErrorMessage(e.message);
    });

    twitchChat.client.on("join", () => {
      setIsConnecting(false);
    });

    twitchChat.client.on("clearchat", () => {
      setChatMessages([]);
    });

    twitchChat.client.on("timeout", handleRemovedUser);
    twitchChat.client.on("ban", handleRemovedUser);
    twitchChat.client.on("messagedeleted", handleDeletedMessage);
    twitchChat.client.on("message", handleChatMessage);
  }

  async function getTwitchUserId(channelName) {
    const response = await fetch(
      `/.netlify/functions/twitch-user?username=${channelName}`
    );

    const { id } = await response.json();

    if (!id) {
      throw new Error("No user ID");
    }

    return id;
  }

  async function getParamVariables() {
    if (!window) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const channelName = params.get("channelName");
    let channelId = params.get("channelId");
    const hiddenUsers = params.get("hiddenUsers");

    const noChannelName = !channelName || channelName.length === 0;
    if (noChannelName) {
      setErrorMessage("Missing ?channelName= in the title");
      return;
    }

    const noChannelId = !channelId || channelId.length === 0;
    if (noChannelId) {
      try {
        channelId = await getTwitchUserId(channelName);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        setErrorMessage(
          "Couldn't get a channel ID for your channel name. Is it correct?"
        );
      }
    }

    if (hiddenUsers) {
      setHiddenUsers(hiddenUsers.split(","));
    }
    setChannel({ name: channelName, id: channelId });
  }

  const Row = ({ index, style }) => {
    const chatMessage = chatMessages[index];

    const rowRef = useRef({});

    useEffect(() => {
      if (rowRef.current) {
        setRowHeight(index, rowRef.current.clientHeight);
      }
    }, [index, rowRef]);

    return (
      <div style={style} key={chatMessage.id}>
        <div ref={rowRef} className="Message">
          <div className="MessageUser">
            {chatMessage.user.pronouns && (
              <div className="MessageUserPronouns">
                {chatMessage.user.pronouns}
              </div>
            )}
            <div
              className="MessageUserUsername"
              style={{ color: chatMessage.user.color }}
            >
              {chatMessage.user.username}
            </div>
          </div>
          <div
            className="MessageText"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: chatMessage.text }}
          />
        </div>
      </div>
    );
  };

  return (
    <Router>
      {isConnecting && !hasErrorMessage && (
        <p className="Alert">Connecting to chat...</p>
      )}
      {hasErrorMessage && <p className="Alert AlertError">{errorMessage}</p>}

      <AutoSizer>
        {({ height, width }) => (
          <List
            className={`List ${
              isConnecting || hasErrorMessage ? "ListHidden" : ""
            }`}
            ref={listRef}
            height={height}
            itemCount={chatMessages.length}
            itemSize={getRowHeight}
            estimatedItemSize={MIN_ROW_HEIGHT}
            width={width}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </Router>
  );
}
