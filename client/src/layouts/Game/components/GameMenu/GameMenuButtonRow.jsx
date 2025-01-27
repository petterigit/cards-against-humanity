import React from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { ActionButtonRow } from './ActionButtonRow';
import { BUTTON_TYPES } from '../../../../components/general/Button.jsx';
import { GAME_STATES } from '../../../../consts/gamestates';
import { translateCommon, translateUnderWork } from '../../../../helpers/translation-helpers';
import { GameMenu } from './GameMenu';
import { gameStateSelector } from '../../../../selectors/gameSelectors';
import { playerIsSpectatorSelector } from '../../../../selectors/playerSelectors';

export const GameMenuButtonRow = ({ callbacks: { togglePlayerMode, changeCards, returnBackToLobby, openGameSettings, openHistory } }) => {
    const { t } = useTranslation();

    const gameState = useSelector(gameStateSelector);
    const isSpectator = useSelector(playerIsSpectatorSelector);

    const isLobby = gameState === GAME_STATES.LOBBY;

    return (
        <div className="game-menu-button-row">
            <ActionButtonRow
                buttons={[
                    isSpectator
                        ? {
                              icon: 'login',
                              text: translateCommon('joinToGame', t),
                              callback: togglePlayerMode,
                              type: BUTTON_TYPES.PRIMARY,
                          }
                        : {
                              icon: 'groups',
                              text: translateCommon('goToAudience', t),
                              callback: togglePlayerMode,
                              type: BUTTON_TYPES.PRIMARY,
                          },
                    false &&
                        changeCards && {
                            icon: 'refresh',
                            text: translateCommon('changeCards', t),
                            callback: changeCards,
                            type: BUTTON_TYPES.PRIMARY,
                            disabled: true, // isPlayerCardCzar(player) || isPlayerSpectatorOrJoining(player) || isLobby,
                            tooltip: translateUnderWork('underWork', t),
                        },
                ]}
            />
            <GameMenu
                callbacks={{
                    //togglePlayerMode,
                    changeCards,
                    returnBackToLobby,
                    openGameSettings,
                    openHistory,
                }}
            />
        </div>
    );
};
