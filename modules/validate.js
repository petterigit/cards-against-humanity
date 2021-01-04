import {
    getPlayer
} from "./player.js";
import {
    clamp
} from "./util.js";
import {
    gameOptions,
    playerName
} from "../consts/gameSettings.js";

export const validateHost = (game, playerID) => {
    return game.players.find(
        (player) => player.id === playerID && player.isHost
    );
};

export const validateCardCzar = (game, playerID) => {
    return game.players.find(
        (player) => player.id === playerID && player.isCardCzar
    );
};

export const validatePlayerPlayingWhiteCards = (
    game,
    playerID,
    whiteCardIDs
) => {
    if (game.client.state !== "playingWhiteCards") {
        console.log("Wrong game state to play cards");
        return {
            error: "Tällä hetkellä ei voi pelata valkoisia kortteja"
        };
    }

    const player = getPlayer(game, playerID);
    if (player === undefined) {
        console.log("Player was not found");
        return {
            result: false,
            error: "Pelaajaa ei löytynyt"
        };
    }

    // Do check for if the player is cardczar

    if (
        player.whiteCards.filter((whiteCard) =>
            whiteCardIDs.includes(whiteCard.id)
        ).length !== whiteCardIDs.length
    ) {
        console.log("Player does not have the right cards");
        return {
            result: false,
            error: "Pelaajalla ei ole kortteja"
        };
    }

    return {
        result: true
    };
};

export const validateOptions = (newOptions) => {
    const validatedOptions = {
        ...newOptions,
        maximumPlayers: clamp(
            newOptions.maximumPlayers,
            gameOptions.minimunPlayers,
            gameOptions.maximumPlayers
        ),
        scoreLimit: clamp(
            newOptions.scoreLimit,
            gameOptions.minimumScoreLimit,
            gameOptions.maximumScoreLimit
        ),
        winnerBecomesCardCzar: !!newOptions.winnerBecomesCardCzar,
        allowKickedPlayerJoin: !!newOptions.allowKickedPlayerJoin,
    };
    return validatedOptions;
};

export const validateGameStartRequirements = (game) => {
    const activePlayerCount = game.players.filter(
        (player) => player.state === "active"
    ).length;
    if (activePlayerCount < gameOptions.minimunPlayers)
        return {
            result: false,
            error: `Ei tarpeeksi pelaajia, tarvitaan vähintään ${gameOptions.minimunPlayers}`,
        };
    if (
        activePlayerCount > game.client.options.maximumPlayers ||
        activePlayerCount > gameOptions.maximumPlayers
    )
        return {
            result: false,
            error: "Liikaa pelaajia"
        };

    if (
        game.players.some(
            (player) =>
            player.name.length < playerName.minimumLength ||
            player.name.length > playerName.maximumLength
        )
    ) {
        return {
            result: false,
            error: "Pelaajien nimet eivät kelpaa"
        };
    }

    if (
        game.cards.whiteCards.length <
        gameOptions.startingWhiteCardCount * activePlayerCount
    ) {
        return {
            result: false,
            error: "Ei tarpeeksi valkoisia kortteja"
        };
    }
    if (game.cards.blackCards.length < gameOptions.blackCardsToChooseFrom) {
        return {
            result: false,
            error: "Ei tarpeeksi mustia kortteja"
        };
    }

    return {
        result: true
    };
};

export const validateShowingWhiteCard = (game, playerID) => {
    if (!validateCardCzar(game, playerID)) return {
        error: "Pelaaja ei ole Card Czar"
    };
    if (game.client.state !== "readingCards") return {
        error: "Väärä pelinvaihe"
    };
    return {
        result: true
    };
}