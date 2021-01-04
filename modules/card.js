import {
    getGame,
    setGame,
    everyoneHasPlayedTurn,
    createRound,
    changeGameStateAfterTime,
} from "./game.js";
import {
    validatePlayerPlayingWhiteCards,
    validateCardCzar,
    validateShowingWhiteCard,
} from "./validate.js";
import {
    getPlayer,
    publicPlayersObject,
    setPlayersPlaying
} from "./player.js";
import {
    gameOptions
} from "../consts/gameSettings.js";
import {
    randomBetween
} from "./util.js";

export const playWhiteCards = (io, socket, gameID, playerID, whiteCardIDs) => {
    let game = getGame(gameID);
    if (!game) return;
    if (!validatePlayerPlayingWhiteCards(game, playerID, whiteCardIDs).result)
        return;

    const player = getPlayer(game, playerID);
    if (!player) return;

    const whiteCards = player.whiteCards.filter((whiteCard) =>
        whiteCardIDs.includes(whiteCard.id)
    );
    player.whiteCards = player.whiteCards.filter(
        (whiteCard) => !whiteCardIDs.includes(whiteCard.id)
    );

    game.cards.playedWhiteCards = [
        ...game.cards.playedWhiteCards,
        ...whiteCards,
    ];

    player.state = "waiting";
    game.players = game.players.map((oldPlayer) =>
        oldPlayer.id === player.id ? player : oldPlayer
    );

    game.currentRound.whiteCardsByPlayer = [
        ...game.currentRound.whiteCardsByPlayer,
        createWhiteCardsByPlayer(whiteCards, playerID),
    ];

    if (everyoneHasPlayedTurn(game)) {
        game.client.state = "readingCards";
        game.client.whiteCardsByPlayer = shuffleCards([...game.client.whiteCardsByPlayer]);
    }

    setGame(game);
    io.in(gameID).emit("update_game", {
        game: game.client
    });
    io.in(gameID).emit("update_players", {
        players: publicPlayersObject(game.players),
    });
    io.to(player.socket).emit("update_player", {
        player: player
    });

    console.log("made it to end");
};

export const selectBlackCard = (
    io,
    gameID,
    playerID,
    selectedCardID,
    discardedCardIDs
) => {
    const game = getGame(gameID);
    if (!game) return;

    if (!validateCardCzar(game, playerID)) return;

    if (
        !game.cards.playedBlackCards.some(
            (blackCard) => blackCard.id === selectedCardID
        )
    )
        return;

    if (discardedCardIDs.length !== gameOptions.blackCardsToChooseFrom - 1)
        return;
    const discardedCards = game.cards.playedBlackCards.filter((blackCard) =>
        discardedCardIDs.includes(blackCard.id)
    );
    if (discardedCards.length !== discardedCardIDs.length) return;

    game.cards.playedBlackCards = game.cards.playedBlackCards.filter(
        (blackCard) => !discardedCardIDs.includes(blackCard.id)
    );
    const selectedCard = game.cards.playedBlackCards.filter(
        (blackCard) => blackCard.id === selectedCardID
    );
    if (selectedCard.length !== 1) return;

    game.cards.blackCards = shuffleCardsBackToDeck(
        discardedCards,
        game.cards.blackCards
    );

    game.currentRound = createRound(
        game.client.rounds.length + 1,
        selectedCard[0],
        playerID
    );
    game.client.rounds = [...game.client.rounds, game.currentRound];

    game.stateMachine.startPlayingWhiteCards();
    game.client.state = game.stateMachine.state;
    game.players = setPlayersPlaying(game.players);
    setGame(game);

    io.in(gameID).emit("update_game", {
        game: game.client
    });
    changeGameStateAfterTime(
        io,
        gameID,
        "startReading",
        game.client.options.selectWhiteCardTimeLimit +
        gameOptions.defaultGracePeriod
    );
};

export const dealBlackCards = (socket, gameID, playerID) => {
    const game = getGame(gameID);
    if (!game) return;

    if (!validateCardCzar(game, playerID)) return;

    const blackCards = drawBlackCards(game, gameOptions.blackCardsToChooseFrom);
    socket.emit("deal_black_cards", {
        blackCards: blackCards
    });
};

export const dealWhiteCards = (io, game, count) => {
    const players = game.players
        .filter((player) => ["active", "playing", "waiting"].includes(player.state))
        .map((player) => {
            player.whiteCards = drawWhiteCards(game, count);
            io.to(player.socket).emit("update_player", {
                player: player
            });

            return player;
        });
    game.players = players;
    return game;
};

export const drawWhiteCards = (game, count) => {
    if (game.cards.whiteCards.length < count) {
        let cards = [...game.cards.whiteCards];
        if (game.cards.playedWhiteCards.length === 0) return [];

        game.cards.whiteCards = shuffleCards([...game.cards.playedWhiteCards]);
        game.cards.playedWhiteCards = [];

        cards = [
            ...cards,
            game.cards.whiteCards.splice(0, count - cards.length),
        ];
        setGame(game);
        return cards;
    } else {
        const drawnCards = game.cards.whiteCards.splice(0, count);
        setGame(game);
        return drawnCards;
    }
};

export const drawBlackCards = (game, count) => {
    if (game.cards.blackCards.length < count) {
        let blackCards = [...game.cards.blackCards];

        game.cards.blackCards = shuffleCards([...game.cards.playedBlackCards]);
        game.cards.playedBlackCards = [];

        blackCards = [
            ...blackCards,
            game.cards.blackCards.splice(0, count - blackCards.length),
        ];

        game.cards.playedBlackCards = [...blackCards];
        setGame(game);
        return blackCards;
    }
    const blackCards = game.cards.blackCards.splice(0, count);
    game.cards.playedBlackCards = [
        ...game.cards.playedBlackCards,
        ...blackCards,
    ];
    setGame(game);
    return blackCards;
};

export const shuffleCardsBackToDeck = (cards, deck) => {
    let newCards = [...deck];
    for (const card in cards) {
        newCards.splice(randomBetween(0, newCards.length), 0, card);
    }
    return [...newCards];
};

export const createWhiteCardsByPlayer = (whiteCards, playerID) => {
    return {
        wonRound: false,
        playerID: playerID,
        popularVote: 0,
        whiteCards: whiteCards,
    };
};

export const shuffleCards = (cards) => {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
};

export const showWhiteCard = (io, gameID, playerID) => {
    const game = getGame(gameID);
    if (!game) return;

    const {
        result,
        error
    } = validateShowingWhiteCard(game, playerID);
    if (!result || error) {
        console.log(error);
        return;
    }

    if (game.currentRound.cardIndex === game.currentRound.whiteCardsByPlayer.length) {
        game.client.state = "showingCards";
        setGame(game);
        io.in(gameID).emit("update_game", {
            game: {
                anonymizedGameClient(game);
            }
        });
    } else {
        const whiteCards = game.currentRound.whiteCardsByPlayer[game.currentRound.cardIndex].whiteCards;
        game.currentRound.cardIndex = game.currentRound.cardIndex + 1;
        setGame(game);

        io.in(gameID).emit("show_white_card", whiteCards);
    }
}

export const anonymizePlayedWhiteCards = (playedWhiteCards) => {
    return playedWhiteCards.map(card => ({
        ...card,
        playerID: null
    }));
}

export const anonymizedGameClient = (game) => {
    const roundCount = game.client.rounds.length;
    const lastRound = {
        ...game.client.rounds[roundCount - 1]
    };

    const cards = anonymizePlayedWhiteCards(game.currentRound.whiteCardsByPlayer);
    lastRound.whiteCardsByPlayer = cards;

    return {
        ...game.client,
        rounds: [...game.client.rounds].splice(-1, 1, lastRound)
    }
}