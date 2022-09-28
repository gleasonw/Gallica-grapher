import React from 'react';
import InlineBubble from "./InlineBubble";
import styled from "styled-components";

export function ShadowedFocusInput(props) {
    const [focus, setFocus] = React.useState(false);
    return (
        <InlineBubble focus={focus} selected={props.selected}>
            <StyledFocusInput
                className={props.className}
                type={props.type}
                value={props.value}
                name={props.name}
                placeholder={props.placeholder}
                onChange={props.onChange}
                onKeyUp={props.onKeyUp}
                autoComplete="off"
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
            />
        </InlineBubble>
    )
}

const StyledFocusInput = styled.input`
    width: 100%;
    min-width: 40px;
    `;