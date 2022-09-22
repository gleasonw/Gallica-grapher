import React from "react";
import TextInputBubble from "./TextInputBubble";

export function TermInputBox(props) {
    const [focus, setFocus] = React.useState(false);
    console.log(focus)

    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            props.onEnterPress(event)
        }
    }

    return (
        <TextInputBubble
            noTermsReminder={props.noTermsReminder}
            focus={focus}
        >
            <input
                autoFocus
                type="text"
                value={props.termInput}
                name="updatedTerms"
                placeholder={props.noTermsReminder ? "Please enter a term" : "Enter a search term"}
                onChange={props.handleTermChange}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                onfocusin={() => setFocus(true)}
                onfocusout={() => setFocus(false)}
            />
        </TextInputBubble>
    )
}