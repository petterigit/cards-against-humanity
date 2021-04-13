import {
    appointNextCardCzar,
    setPlayersActive,
    updatePlayersIndividually,
} from "./player.js";
import { getGame, setGame, skipRound, startNewRound } from "./game.js";
import { showWhiteCard, shuffleCardsBackToDeck } from "./card.js";

import { gameOptions } from "../consts/gameSettings.js";

export const changeGameStateAfterTime = (io, game, transition) => {
    clearTimeout(game.timeout);

    const delay = getTimeoutTime(game);
    if (delay === undefined) {
        game.client.timers.duration = undefined;
        game.client.timers.passedTime = undefined;
        game.timeout = undefined;
        return game;
    }

    game.client.timers.duration = delay;
    game.client.timers.passedTime = 0;

    game.timeout = setTimeout(
        gameStateChange,
        (delay + gameOptions.defaultGracePeriod) * 1000,
        io,
        game.id,
        transition
    );
    return game;
};

export const clearGameTimer = (game) => {
    clearTimeout(game.timeout);
    game.timeout = undefined;
    game.client.timers.duration = undefined;
    game.client.timers.passedTime = undefined;
    return game;
};

const gameStateChange = async (io, gameID, transition) => {
    const game = await getGame(gameID);
    if (!game) return;

    console.log("Handling state change to", transition);

    if (game.stateMachine.cannot(transition)) return;

    console.log("Change was legal", transition);

    let setNewTimeout = "";

    if (transition === "startRound") {
        const cardCzar = currentCardCzar(game.players);
        if (!cardCzar) return;
        startNewRound(io, null, gameID, cardCzar.id);
        return;
    } else if (transition === "startPlayingWhiteCards") {
        // Cardczar didn't pick a blackcard, appoint next cardczar
        game.players = punishCardCzar(game);
        restartRound(io, game);
        return;
    } else if (transition === "startReading") {
        // There might not be any cards to read, in which case skip round
        if (game.currentRound.whiteCardsByPlayer.length === 0) {
            const cardCzar = currentCardCzar(game.players);
            if (!cardCzar) return;

            game.players = appointNextCardCzar(game, cardCzar.id);
            const nextCardCzar = currentCardCzar(game.players);

            skipRound(io, game, nextCardCzar);
            return;
        }
        setNewTimeout = "showCards";
    } else if (transition === "showCards") {
        // Check if all whitecards have been showed, otherwise show next whitecards
        const cardCzar = currentCardCzar(game.players);
        if (!cardCzar) return;
        showWhiteCard(io, null, gameID, cardCzar.id);
        return;
    } else if (transition === "endRound") {
        // Nothing was voted, remove points from card czar as punishment
        game.players = punishCardCzar(game);
        setNewTimeout = "startRound";
    }

    game.stateMachine[transition]();
    game.client.state = game.stateMachine.state;
    game.players = setPlayersActive(game.players);

    if (setNewTimeout != "") {
        const updatedGame = changeGameStateAfterTime(io, game, setNewTimeout);
        setGame(updatedGame);
        updatePlayersIndividually(io, updatedGame);
    } else {
        updatePlayersIndividually(io, game);
        setGame(game);
    }
};

const currentCardCzar = (players) => {
    return players.find((player) => player.isCardCzar);
};

const restartRound = (io, game) => {
    const cardCzar = currentCardCzar(game.players);
    if (!cardCzar) return;

    game.cards.blackCards = shuffleCardsBackToDeck(
        [...game.cards.sentBlackCards],
        game.cards.blackCards
    );
    game.cards.sentBlackCards = [];

    game.players = appointNextCardCzar(game, cardCzar.id);
    const nextCardCzar = currentCardCzar(game.players);

    skipRound(io, game, nextCardCzar);
};

export const punishCardCzar = (game) => {
    return game.players.map((player) => {
        if (player.isCardCzar && game.stateMachine.state !== "roundEnd") {
            player.score -= gameOptions.notSelectingWinnerPunishment;
        }
        return player;
    });
};

const getTimeoutTime = (game) => {
    const timers = game.client.options.timers;
    switch (game.stateMachine.state) {
        case "pickingBlackCard":
            return timers.useSelectBlackCard
                ? timers.selectBlackCard
                : undefined;
        case "playingWhiteCards":
            return timers.useSelectWhiteCards
                ? timers.selectWhiteCards
                : undefined;
        case "readingCards":
            return timers.useReadBlackCard ? timers.readBlackCard : undefined;
        case "showingCards":
            return timers.useSelectWinner ? timers.selectWinner : undefined;
        case "roundEnd":
            return timers.useRoundEnd ? timers.roundEnd : undefined;
        default:
            return timers.selectBlackCard;
    }
};

export const getPassedTime = (timeout) => {
    if (!timeout) return undefined;
    return process.uptime() - timeout._idleStart / 1000;
};
