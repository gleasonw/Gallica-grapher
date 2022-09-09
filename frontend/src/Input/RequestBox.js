import React from "react";
import styled from 'styled-components';
import LesserButton from "../shared/LesserButton";
import AddBoxIcon from '@mui/icons-material/AddBox';
import Ticket from "./Ticket";
import SmallIconStyle from "../shared/SmallIconStyle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";

export function RequestBox(props) {
    const numTickets = Object.keys(props.tickets).length
    return(
        <StyledTicketRow>
            <OverflowScrollTicketRow>
                {Object.keys(props.tickets).map((ticketID,index) => (
                    <Ticket
                        ticket={props.tickets[ticketID]}
                        key={ticketID}
                        ticketID={ticketID}
                        firstInRow = {index === 0}
                        lastInRow = {index === numTickets - 1}
                        actionIcon={
                            <SmallIconStyle onClick={() => props.onTicketClick(ticketID)}>
                                <RemoveCircleIcon/>
                            </SmallIconStyle>
                        }
                    />
                ))}
            </OverflowScrollTicketRow>
            {Object.keys(props.tickets).length < 5 &&
            <LesserButton
                onClick={props.onCreateTicketClick}
                borderRadius="0px 0px 10px 10px"
            >
                <AddBoxIcon/>
                Compare
            </LesserButton>
            }
        </StyledTicketRow>
    )
}

const StyledTicketRow = styled.div`
    display: flex;
    flex-direction: row;
    overflow: visible;
`;

const OverflowScrollTicketRow = styled(StyledTicketRow)`
    overflow-x: scroll;
    overflow-y: visible;
`;

export const StyledRequestBox = styled(RequestBox)`
    display: flex;
    flex-direction: row;
    transition: all 150ms;
    overflow: visible;
`;

