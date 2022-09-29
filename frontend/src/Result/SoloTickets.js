import React from "react";
import TicketLabel from "../shared/TicketLabel";
import ClassicUIBox from "../shared/ClassicUIBox";
import RecordsViewer from "./RecordsViewer";

function SoloTickets(props) {
    return (
        <div className='ticketResultsContainer'>
            {Object.keys(props.tickets).map(key => (
                <SoloTicketResult
                    ticket={props.tickets[key]}
                    key={key}
                    ticketID={key}
                    requestID={props.requestID}
                    cacheID={props.cacheID}
                />
            ))}
        </div>
    )
}
//TODO: sync timebin display with state
function SoloTicketResult(props) {
    return (
        <ClassicUIBox resize={'both'}>
            <TicketLabel
                terms={props.ticket.terms}
                papers={props.ticket.papersAndCodes}
                dateRange={props.ticket.dateRange}
                linkTerm={props.ticket.linkTerm}
                linkDistance={props.ticket.linkDistance}
                compact={false}
            />
            <RecordsViewer
                tickets={{[props.ticketID]: props.ticket}}
                requestID={props.requestID}
                settingsID={props.ticketID}
                cacheID={props.cacheID}
            />
        </ClassicUIBox>
    )
}

export default SoloTickets;