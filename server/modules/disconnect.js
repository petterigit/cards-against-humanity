import {
    ERROR_TYPES,
    NOTIFICATION_TIME,
    NOTIFICATION_TYPES,
} from "../consts/error.js";
import {
    appointNextCardCzar,
    emitToAllPlayerSockets,
    getActivePlayers,
    getAllActivePlayers,
    updatePlayersIndividually,
} from "./player.js";
import { closeSocketWithID, sendNotification } from "./socket.js";
import {
    everyoneHasPlayedTurn,
    findGameAndPlayerBySocketID,
    removeGame,
    removeGameIfNoActivePlayers,
    returnToLobby,
    setGame,
    shouldGameBeDeleted,
    shouldReturnToLobby,
    shouldSkipRound,
    skipRound,
} from "./game.js";

import { INACTIVE_GAME_DELETE_TIME } from "../consts/gameSettings.js";
import { setPlayer } from "./join.js";
import { startReading } from "./card.js";

export const setPlayerDisconnected = (io, socketID, removePlayer) => {
    const result = findGameAndPlayerBySocketID(socketID);
    if (!result) return;

    const { game, player } = result;
    if (!player) return;

    const remainingSockets = player.sockets.filter(
        (socket) => socket !== socketID
    );
    if (remainingSockets.length > 0 && !removePlayer) {
        player.sockets = remainingSockets;
        game.players = setPlayer(game.players, player);
        setGame(game);
        return;
    }

    if (removePlayer || player.state === "spectating") {
        game.players = game.players.filter(
            (gamePlayer) => gamePlayer.id !== player.id
        );
        player.sockets.map((socket) => {
            closeSocketWithID(io, socket);
        });
    } else {
        player.state = "disconnected";
        player.sockets = remainingSockets;
        game.players = setPlayer(game.players, player);
    }

    if (shouldGameBeDeleted(game)) {
        if (removePlayer) {
            removeGame(game.id);
            return;
        } else {
            setTimeout(
                () => removeGameIfNoActivePlayers(game.id),
                INACTIVE_GAME_DELETE_TIME
            );
            setGame(game);
            return;
        }
    }

    if (player.isHost) {
        game.players = handleHostLeaving(game, player);
        if (!game.players) return;

        const newHost = game.players.find((player) => player.isHost);
        emitToAllPlayerSockets(io, newHost, "upgraded_to_host", {
            notification: {
                text: ERROR_TYPES.promotedToHost,
                type: NOTIFICATION_TYPES.default,
                time: NOTIFICATION_TIME,
            },
        });
    }

    handleSpecialCases(io, game, player);
};

export const handleSpecialCases = (io, game, player) => {
    if (shouldSkipRound(game)) {
        game.players = appointNextCardCzar(game, getCardCzar(game.players)?.id);
        const nextCardCzar = getCardCzar(game.players);
        skipRound(io, game, nextCardCzar);
        return;
    }

    if (shouldReturnToLobby(game)) {
        returnToLobby(io, game);
        sendNotification(
            ERROR_TYPES.notEnoughPlayers,
            NOTIFICATION_TYPES.default,
            { io: io, gameID: game.id }
        );
        return;
    }

    if (player.isCardCzar) {
        handleCardCzarLeaving(io, game, player);
        return;
    }

    if (game.stateMachine.state === "playingWhiteCards") {
        handlePlayerLeavingDuringWhiteCardSelection(io, game, player);
        return;
    }

    setGame(game);
    updatePlayersIndividually(io, game);
};

const handlePlayerLeavingDuringWhiteCardSelection = (io, game) => {
    if (everyoneHasPlayedTurn(game)) {
        startReading(io, game);
    } else {
        setGame(game);
        updatePlayersIndividually(io, game);
    }
};

const handleCardCzarLeaving = (io, game, cardCzar) => {
    game.players = appointNextCardCzar(game, cardCzar.id);
    skipRound(io, game, getCardCzar(game.players));
};

const handleHostLeaving = (game, host) => {
    const hostIndex = game.players.findIndex((player) => player.id === host.id);
    if (hostIndex !== -1) {
        game.players[hostIndex].isHost = false;
    }

    let players = [];
    if (game.stateMachine.state === "lobby") {
        players = getAllActivePlayers(game.players);
    } else {
        players = getActivePlayers(game.players);
    }

    const activePlayers = players.filter((player) => player.id !== host.id);

    if (activePlayers.length > 0) {
        game.players = game.players.map((player) =>
            player.id === activePlayers[0].id
                ? { ...player, isHost: true }
                : player
        );
    } else {
        console.log("Host left and no one to make new host, removing game...");
        removeGame(game.id);
        return undefined;
    }
    return [...game.players];
};

const getCardCzar = (players) => players.find((player) => player.isCardCzar);
