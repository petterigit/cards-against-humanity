import { a, useTrail } from 'react-spring';

import { Button } from '../../../../components/Button.jsx';
import React from 'react';

export const ActionButtonRow = ({ buttons }) => {
    const renderedButtons = [];

    for (let i = 0, len = buttons.length; i < len; i++) {
        const buttonProps = buttons[i];

        renderedButtons.push(<Button key={i} {...buttonProps} fill={true} />);
    }

    const trail = useTrail(renderedButtons.length, {
        //from: { transform: "translate3d(-20px,0,0)" },
        //to: {
        //    transform: "translate3d(20px,0,0)",
        //},
    });

    if (!trail || trail.length < 1) {
        return null;
    }

    return (
        <div className="button-row-container">
            {trail.map((styles, index) => (
                <a.span key={index} style={styles}>
                    {renderedButtons[index]}
                </a.span>
            ))}
        </div>
    );
};
