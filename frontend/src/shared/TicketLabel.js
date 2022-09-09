import React from 'react';
import {ExpandableBlurbControl} from "./ExpandableBlurbControl";
import {BlurbText} from "./BlurbText";
import styled from "styled-components";

function TicketLabel(props){
    const paperBlurb = props.papers.length > 0 ?
        generateBlurb(getPaperNames(props.papers))
        :
        <BlurbText>all papers</BlurbText>
    const dateString = `${props.dateRange[0]} to ${props.dateRange[1]}`
    if(props.compact){
        return(
            <StyledCompactTicketLabel>
                Occurrences of
                {generateBlurb(props.terms)}
                in
                {paperBlurb}
                from
                <BlurbText>{dateString}</BlurbText>
            </StyledCompactTicketLabel>
        )
    }else{
        return(
            <StyledTicketLabel>
                Occurrences of
                {generateBlurb(props.terms)}
                in
                {paperBlurb}
                from
                <BlurbText>{dateString}</BlurbText>
            </StyledTicketLabel>
        )
    }
}

const StyledTicketLabel = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
`;

const StyledCompactTicketLabel = styled.div`
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
`;

function generateBlurb(items){
    const highestIndexBefore28Characters = getHighestIndexBefore28CharactersCombined(items)
    const numItemsRemaining = items.length - highestIndexBefore28Characters - 1
    if(numItemsRemaining > 0){
        return generateExpandableBlurb(
            items,
            highestIndexBefore28Characters,
            numItemsRemaining
        )
    }else{
        return generateFixedBlurb(items)
    }
}

function generateExpandableBlurb(items, indexToStopAt, numItemsRemaining){
    const quotedItems = items.map(item => `"${item}"`)
    let shortenedItemString = quotedItems.slice(0, indexToStopAt + 1)
    const itemString = quotedItems.join(', ')
    shortenedItemString = shortenedItemString.join(', ')
    return(
        <ExpandableBlurbControl
            numItemsRemaining={numItemsRemaining}
            allItems={itemString}
            shortenedItems={shortenedItemString}
            items={items}
        />
    )
}


function generateFixedBlurb(items){
    const quotedItems = items.map(item => `"${item}"`)
    const commaSeparatedItems = quotedItems.join(', ')
    return <BlurbText>{commaSeparatedItems}</BlurbText>
}

function getPaperNames(papers){
    let paperNames = []
    papers.map(paperAndCode => (
        paperNames.push(paperAndCode['title'])
    ));
    return paperNames
}

function getHighestIndexBefore28CharactersCombined(items) {
    let combinedLength = 0
    let highestIndex = 0
    items.map((item, index) => {
        combinedLength += item.length
        if (combinedLength < 28) {
            highestIndex = index
        } else {
            return highestIndex
        }
    })
    return highestIndex
}

export default TicketLabel;
