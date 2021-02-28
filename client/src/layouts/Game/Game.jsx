import "./../../styles/game.scss";

import Button, { BUTTON_TYPES } from "../../components/button";
import { CONTROL_TYPES, Setting } from "../../components/settings/setting";
import React, { useEffect, useState } from "react";
import { getCookie, setCookie } from "../../helpers/cookies";

import { BlackCardPickerContainer } from "../../components/card-picker/blackcardpickercontainer";
import { CardReadingContainer } from "../../components/card-picker/cardreadingcontainer";
import { GAME_STATES } from "../../consts/gamestates";
import { GameEndContainer } from "../../components/card-picker/gameendcontainer";
import { GameSettingsContainer } from "../../components/game-settings/gamesettingscontainer";
import { NOTIFICATION_TYPES } from "../../components/notification/notification";
import { PlayerName } from "../../components/options/PlayerName";
import { PlayersWidget } from "../../components/players-widget/playerswidget";
import { RoundEndContainer } from "../../components/card-picker/roundendcontainer";
import { Timer } from "../../components/timer";
import { WaitingCardPickerContainer } from "../../components/card-picker/waitincardpickercontainer";
import { WhiteCardPickerContainer } from "../../components/card-picker/whitecardpickercontainer";
import { WinnerCardPickerContainer } from "../../components/card-picker/winnercardpickercontainer";
import { socket } from "../../components/sockets/socket";
import { getGamePhaseContent } from "./getGamePhaseContent";

export const NAME_CHAR_LIMIT = 50;
export const ICON_CLASSNAMES = "md-36 icon-margin-right";

export const Game = (props) => {
    const { game, player, fireNotification, updateData } = props;
    const isSpectator = player ? player.state === "spectating" : false;

    const [startingProgress, setStartingProgress] = useState(0);
    const [timerIsOn, setTimerIsOn] = useState(false);
    const [blackCards, setBlackCards] = useState([]);
    const [popularVotedCardsIDs, setPopularVotedCardsIDs] = useState([]);

    const getGameIdFromURL = () => {
        const url = window.location.pathname;
        return url.replace("/g/", "");
    };

    useEffect(() => {
        if (game === undefined) {
            const cookie = getCookie("playerID");
            if (socket.disconnected) {
                console.log("opening socket");
                socket.open();
            }
            socket.emit("join_game", {
                gameID: getGameIdFromURL(),
                playerID: cookie,
            });
            console.log(
                "joining game!",
                cookie,
                "socket",
                socket,
                "game",
                game
            );
        }
    }, [game, player]);

    useEffect(() => {
        socket.on("send_popular_voted_cards", (data) => {
            setPopularVotedCardsIDs(data.whiteCardIDs);
        });

        return () => {
            socket.off("send_popular_voted_cards");
        };
    }, []);

    useEffect(() => {
        socket.on("update_player", (data) => {
            setCookie({ field: "playerID", value: data.player.id });
            updateData({ player: data.player });
        });

        socket.on("update_game", (data) => {
            updateData({ game: data.game });
        });

        socket.on("update_players", (data) => {
            updateData({ players: data.players });
        });

        socket.on("update_game_options", (data) => {
            updateData({ options: data.options });
        });

        socket.on("deal_black_cards", (data) => {
            setBlackCards(data.blackCards);
        });

        socket.on("upgrade_to_host", (data) => {
            const notification = {
                text:
                    "Pelin edellinen isäntä lähti, joten sinä olet nyt uusi isäntä!",
                type: NOTIFICATION_TYPES.DEFAULT,
                icon: {
                    name: "info",
                    color: "blue",
                    className: "type-icon",
                },
            };

            fireNotification(notification, 5);
        });

        socket.on("update_timers", (data) => {
            updateData({ timers: data.timers });
        });

        return () => {
            socket.off("update_player");
            socket.off("update_game");
            socket.off("update_players");
            socket.off("update_game_options");
            socket.off("deal_black_cards");
            socket.off("upgrade_to_host");
        };
    }, []);

    const resetTimer = () => {
        setTimerIsOn(false);

        setTimeout(() => {
            setTimerIsOn(true);
        }, 100);
    };

    useEffect(() => {
        if (game?.timers.passedTime && game?.timers.duration) {
            const { passedTime, duration } = game.timers;
            let currentProgress = (passedTime + 0.1) / duration;
            currentProgress = currentProgress < 0.01 ? 0 : currentProgress;

            setStartingProgress(currentProgress);

            resetTimer();
        }
    }, [game?.state, game?.timers]);

    // New window is opened for the same user in an existing game
    // Ask for black cards
    useEffect(() => {
        if (
            game?.state === GAME_STATES.PICKING_BLACK_CARD &&
            player?.isCardCzar
        ) {
            socket.emit("draw_black_cards", {
                gameID: game.id,
                playerID: player.id,
            });
        }
    }, []);

    const startGame = (gameID, playerID) => {
        if (!!gameID && !!playerID) {
            socket.emit("start_game", { gameID, playerID });
        }
    };

    //console.log(`Is socket still open: ${socket.connected ? "Yes" : "No"}`);

    const setPlayerName = (name) => {
        const cleanedName = name.trim();

        if (!!player?.id && cleanedName.length > 0) {
            socket.emit("set_player_name", {
                gameID: game?.id,
                playerID: player?.id,
                playerName: cleanedName,
            });
        }
    };

    const givePopularVote = (cardIDs) => {
        socket.emit("give_popular_vote", {
            gameID: game?.id,
            playerID: player?.id,
            whiteCardIDs: cardIDs,
        });
    };

    const togglePlayerMode = () => {
        console.log("toggle");
        socket.emit("toggle_player_mode", {
            gameID: game?.id,
            playerID: player?.id,
        });
    };

    const contentProps = {
        callbacks: {
            setPlayerName,
            givePopularVote,
            togglePlayerMode,
            startGame,
        },
        game,
        player,
        blackCards,
        popularVotedCardsIDs,
    };

    const renderedContent = getGamePhaseContent(contentProps);

    return (
        <div>
            <div className="info">
                <PlayersWidget game={game} player={player} />
                <Timer
                    width={100}
                    percent={
                        game?.state === GAME_STATES.LOBBY
                            ? 0
                            : timerIsOn
                            ? 1
                            : 0
                    }
                    startingPercent={
                        game?.state === GAME_STATES.LOBBY ? 0 : startingProgress
                    }
                    time={game?.timers.duration ?? 0}
                />
                <Button text={"toggle spectator"} callback={togglePlayerMode} />
            </div>
            <div className="lobby-container">{renderedContent}</div>
        </div>
    );
};