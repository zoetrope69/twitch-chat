import React, { Fragment, useState, useEffect, useRef } from "react";
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
  }, []);

  useEffect(() => {
    if (channel.name) {
      initialiseChat();
    }
  }, [channel]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
    // eslint-disable-next-line
  }, [chatMessages]);

  function Row({ index, style }) {
    const rowRef = useRef({});

    useEffect(() => {
      if (rowRef.current) {
        setRowHeight(index, rowRef.current.clientHeight);
      }
    }, [rowRef]);

    const chatMessage = chatMessages[index];

    const isMostRecent = index === chatMessages.length - 1;

    return (
      <div
        className={`Row ${isMostRecent ? "RowMostRecent" : ""}`}
        style={style}
        key={chatMessage.id}
      >
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
            dangerouslySetInnerHTML={{ __html: chatMessage.text }}
          />
        </div>
      </div>
    );
  }

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

  function addToChatMessage(chatMessage) {
    setChatMessages(previousChatMessages => {
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
    "#8A2BE2": "#CF9AFF" // Blue Violet
  };

  function getColor(color) {
    if (!color) {
      return "white";
    }

    const readableColor = DARK_MODE_READABLE_COLOR_MAP[color.toUpperCase()];
    if (readableColor) {
      return readableColor;
    }

    // TODO handle custom colours with ratio check

    return color;
  }

  async function handleChatMessage(_channel, data, message, self) {
    console.log("message data", data);
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
      console.error(e);
    }

    const textWithEmotes = await replaceTextWithEmotes(
      message,
      emotes,
      channel.id
    );

    addToChatMessage({
      id,
      user: {
        color: getColor(color),
        username,
        pronouns
      },
      text: textWithEmotes
    });
  }

  function initialiseChat() {
    if (!isConnecting) {
      return;
    }

    const twitchChat = new TwitchChat(channel.name, setErrorMessage);

    twitchChat.client.on("error", e => {
      setErrorMessage(e.message);
    });

    twitchChat.client.on("join", data => {
      setIsConnecting(false);
    });

    twitchChat.client.on("clearchat", () => {
      setChatMessages([]);
    });

    twitchChat.client.on("message", handleChatMessage);
  }
  
  function getParamVariables() {
    if (!window) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const channelName = params.get("channelName");
    const channelId = params.get("channelId");
    const hiddenUsers = params.get("hiddenUsers");

    const noChannelName = !channelName || channelName.length === 0;
    if (noChannelName) {
      setErrorMessage("Missing ?channelName= in the title");
      return;
    }

    const noChannelId = !channelId || channelId.length === 0;
    if (noChannelId) {
      setErrorMessage(
        "Missing ?channelId= in the URL. Type in chat to get user ID."
      );
    }

    if (hiddenUsers) {
      setHiddenUsers(hiddenUsers.split(","));
    }
    setChannel({ name: channelName, id: channelId });
  }

  return (
    <Router>
      {isConnecting && !hasErrorMessage && (
        <p className="Alert">Connecting to chat...</p>
      )}
      {hasErrorMessage && <p className="Alert AlertError">{errorMessage}</p>}

      <AutoSizer>
        {({ height, width }) => (
          <Fragment>
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
          </Fragment>
        )}
      </AutoSizer>
    </Router>
  );
}
