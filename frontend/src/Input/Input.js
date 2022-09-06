import React, {useRef, useState} from "react";
import TicketForm from './TicketForm';
import TicketLabel from "../shared/TicketLabel";
import DecorativeTicket from "../shared/DecorativeTicket";
import ImportantButtonWrap from "../shared/ImportantButtonWrap";
import useData from "../shared/hooks/useData";

//TODO: add a reducer
function Input(props){
    const exampleBoxRef = useRef(null);
    const [terms, setTerms] = useState([]);
    const [termInput, setTermInput] = useState('');
    const [userSelectedPapers, setUserSelectedPapers] = useState([]);
    const [selectedPaperInput, setSelectedPaperInput] = useState(0);
    const [customPapersDateRange, setCustomPapersDateRange] = useState(['','']);
    const [continuousDateRange, setContinuousDateRange] = useState(['','']);
    const [fullSearchDateRange, setFullSearchDateRange] = useState(['','']);
    const queryForContinuousPapers = getContinuousPaperQuery();
    const result = useData(queryForContinuousPapers);
    const continuousPapers = result ? result['paperNameCodes'] : [];
    console.log(`${continuousPapers.length} for date range ${continuousDateRange[0]} to ${continuousDateRange[1]}`)
    const boundaryYearsForUserPapers = setUserPapersYearBoundary();

    function getContinuousPaperQuery(){
        let queryLowYear = continuousDateRange[0] === '' ?
        1890 : continuousDateRange[0];
        let queryHighYear = continuousDateRange[1] === '' ?
            1920 : continuousDateRange[1];
        return "api/continuousPapers?limit=2000" +
            "&startYear=" + queryLowYear +
            "&endYear=" + queryHighYear;
    }

    function setUserPapersYearBoundary(){
        let minYear = 1499
        let maxYear = 2020
        if(userSelectedPapers.length > 0){
            const paperLowYears = userSelectedPapers.map(paper => paper["startDate"])
            const paperHighYears = userSelectedPapers.map(paper => paper["endDate"])
            minYear = Math.min(...paperLowYears)
            maxYear = Math.max(...paperHighYears)
        }
        return [minYear, maxYear]
    }

    function handleSeeExamplesClick(){
        exampleBoxRef.current.scrollIntoView({behavior: "smooth"})
    }

    function handleSubmit(event){
        event.preventDefault();
        const ticket = {
            terms: terms,
            papersAndCodes: getPapersFor(selectedPaperInput),
            dateRange: getDateRangeFor(selectedPaperInput)
        }
        props.onTicketSubmit(ticket);
    }

    function handleTermChange(event) {
        const input = event.target.value
        const splitCommaTerms = input.split(',')
        const trimmedTerms = splitCommaTerms.map(term => term.trim())
        setTermInput(input)
        setTerms(trimmedTerms)
    }

    function handlePaperDropdownClick(paper){
        makePaperBubble(paper)
    }

    function handlePaperInputSelectClick(paperInputIndex){
        setSelectedPaperInput(paperInputIndex);
    }

    function handleContinuousLowYearChange(event){
        const inputLowYear = event.target.value
        if(isNumeric(inputLowYear) || inputLowYear === '') {
            const updatedContinousRange = continuousDateRange.slice()
            updatedContinousRange[0] = inputLowYear
            setContinuousDateRange(updatedContinousRange)
        }
    }

    function handleContinuousHighYearChange(event){
        const inputHighYear = event.target.value
        if(isNumeric(inputHighYear) || inputHighYear === '') {
            const updatedContinousRange = continuousDateRange.slice()
            updatedContinousRange[1] = inputHighYear
            setContinuousDateRange(updatedContinousRange)
        }
    }

    function handleCustomLowYearChange(event){
        const inputLowYear = event.target.value
        if(isNumeric(inputLowYear) || inputLowYear === '') {
            const updatedCustomRange = customPapersDateRange.slice()
            updatedCustomRange[0] = inputLowYear
            setCustomPapersDateRange(updatedCustomRange)
        }
    }
    
    function handleCustomHighYearChange(event){
        const inputHighYear = event.target.value
        if(isNumeric(inputHighYear) || inputHighYear === '') {
            const updatedCustomRange = customPapersDateRange.slice()
            updatedCustomRange[1] = inputHighYear
            setCustomPapersDateRange(updatedCustomRange)
        }
    }

    function handleFullSearchLowYearChange(event){
        const inputLowYear = event.target.value
        if(isNumeric(inputLowYear) || inputLowYear === '') {
            const updatedFullSearchRange = fullSearchDateRange.slice()
            updatedFullSearchRange[0] = inputLowYear
            setFullSearchDateRange(updatedFullSearchRange)
        }
    }
    
    function handleFullSearchHighYearChange(event){
        const inputHighYear = event.target.value
        if(isNumeric(inputHighYear) || inputHighYear === '') {
            const updatedFullSearchRange = fullSearchDateRange.slice()
            updatedFullSearchRange[1] = inputHighYear
            setFullSearchDateRange(updatedFullSearchRange)
        }
    }

    function handleCreateTicketClick(){
        props.onCreateTicketClick({
            'terms': terms,
            'papersAndCodes': getPapersFor(selectedPaperInput),
            'dateRange': getDateRangeFor(selectedPaperInput)
        });
        setTermInput('');
        setTerms([]);
    }

    function deleteTermBubble(bubbleIndex){
        const newTerms = terms.slice()
        newTerms.splice(bubbleIndex, 1)
        setTerms(newTerms)
    }
    
    function makePaperBubble(paper){
        const updatedPapers = userSelectedPapers.slice();
        updatedPapers.push(paper)
        setUserSelectedPapers(updatedPapers)
    }

    function deletePaperBubble(bubbleIndex){
        const updatedPapers = userSelectedPapers.slice();
        updatedPapers.splice(bubbleIndex, 1)
        setUserSelectedPapers(updatedPapers)
    }
    
    function getPapersFor(paperInputIndex){
        if(paperInputIndex === 0){
            return continuousPapers
        }else if(paperInputIndex === 1){
            return userSelectedPapers
        }else if(paperInputIndex === 2){
            return []
        }else{
            throw Error(`Unexpected paper index: ${paperInputIndex}`)
        }
    }

    function getDateRangeFor(paperInputIndex){
        if(paperInputIndex === 0){
            return assignNullRangeValuesToPlaceholder(
                continuousDateRange,
                1890, 
                1920
                )
        }else if(paperInputIndex === 1){
            let trimmedRange = trimCustomPaperRangeToActualPaperRange()
            const lowYearDefault = boundaryYearsForUserPapers[0]
            const highYearDefault = boundaryYearsForUserPapers[1]
            return assignNullRangeValuesToPlaceholder(
                trimmedRange, 
                lowYearDefault, 
                highYearDefault
            )
        }else if(paperInputIndex === 2){
            return assignNullRangeValuesToPlaceholder(
                fullSearchDateRange,
                1499,
                2020
            )
        }else{
            throw Error(`Unexpected paper index: ${paperInputIndex}`)
        }
    }

    function trimCustomPaperRangeToActualPaperRange(){
        const userRange = customPapersDateRange
        const minYear = boundaryYearsForUserPapers[0]
        const maxYear = boundaryYearsForUserPapers[1]
        if(userRange[0] < minYear){
            userRange[0] = minYear
        }
        if(userRange[1] > maxYear){
            userRange[1] = maxYear
        }
        return userRange
    }

    function assignNullRangeValuesToPlaceholder(range, lowDefault, highDefault){
        if (range[0] === '') {
            range[0] = lowDefault
        }
        if (range[1] === '') {
            range[1] =highDefault
        }
        return range
    }

    function isNumeric(str){
        if (typeof str != "string") return false
        return !isNaN(str) && !isNaN(parseFloat(str))
    }

    return (
        <div className='inputBody'>
            <div className='inputUI'>
                <div className="mainTitle">
                    Query the Gallica periodical archive and graph the results.
                </div>
                <TicketForm
                    dateRanges = {[
                        continuousDateRange, 
                        customPapersDateRange,
                        fullSearchDateRange
                    ]}
                    dateRangeHandlers = {[
                        [
                            handleContinuousLowYearChange,
                            handleContinuousHighYearChange
                        ],
                        [
                            handleCustomLowYearChange,
                            handleCustomHighYearChange
                        ],
                        [
                            handleFullSearchLowYearChange,
                            handleFullSearchHighYearChange
                        ]
                    ]}
                    onCreateTicketClick={handleCreateTicketClick}
                    onPaperDropItemClick={handlePaperDropdownClick}
                    terms={terms}
                    termInput={termInput}
                    handleTermChange={handleTermChange}
                    userSelectedPapers={userSelectedPapers}
                    deleteTermBubble={deleteTermBubble}
                    deletePaperBubble={deletePaperBubble}
                    boundaryYearsForUserPapers={boundaryYearsForUserPapers}
                    onSubmit={handleSubmit}
                    onGraphStartClick={handleSubmit}
                    onTicketClick={props.onTicketClick}
                    tickets={props.tickets}
                    exampleBoxRef={exampleBoxRef}
                    onPaperInputClick={handlePaperInputSelectClick}
                    selectedPaperInput={selectedPaperInput}
                    numContinuousPapers={continuousPapers ?
                        continuousPapers.length :
                        '...'
                    }
                />
                <input
                    id='seeExamplesButton'
                    type='button'
                    aria-label='Scroll to examples'
                    onClick={handleSeeExamplesClick}
                    value='Or try some examples ↓'
                />
            </div>
        <ExampleBox
            exampleBoxRef={exampleBoxRef}
            onExampleRequestClick={props.onExampleRequestClick}
        />
        </div>


    )

}
//TODO: Cache the examples.
function ExampleBox(props){
    const exampleJSONdata = require('./exampleRequests.json')
    const exampleRequests = exampleJSONdata["requests"]
    return(
        <div
            className='exampleBox'
            ref={props.exampleBoxRef}
        >
            {Object.keys(exampleRequests).map(requestName => (
                <ExampleRequest
                    title={requestName}
                    request={exampleRequests[requestName]}
                    onClick={props.onExampleRequestClick}
                    key={requestName}
                />
            ))}
        </div>

    )
}
function ExampleRequest(props){
    const tickets = props.request["tickets"]
    console.log(tickets)
    return(
        <ImportantButtonWrap
            onClick={() => props.onClick(tickets)}
            aria-label={`Load example request: ${props.title}`}
        >
            <h1>{props.title}</h1>
            <div className={'exampleRequest'}>
                {Object.keys(tickets).map((ticket) => (
                    <DecorativeTicket key={ticket}>
                        <TicketLabel
                            terms={tickets[ticket]["terms"]}
                            papers={tickets[ticket]["papersAndCodes"]}
                            dateRange={tickets[ticket]["dateRange"]}
                        />
                    </DecorativeTicket>
                ))}

            </div>
        </ImportantButtonWrap>
    )
}

export default Input;