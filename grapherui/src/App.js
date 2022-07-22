import React, {useState, useCallback} from 'react';
import {v4 as uuidv4} from 'uuid';
import InputUI from "./components/InputUI";
import RunningQueriesUI from "./components/RunningQueriesUI";
import ResultUI from "./components/ResultUI";
import './style.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from "axios";


function App() {
    const [tickets, setTickets] = useState([]);
    const [idTickets, setIDTickets] = useState({});
    const [requestID, setRequestID] = useState('');
    const [gettingInput, setGettingInput] = useState(true);
    const [numFinishedTickets, setNumFinishedTickets] = useState(0);

    const header =
        <header className="header">
            <div className="mainTitle">
                The Gallica Grapher
            </div>
        </header>

    async function handleInputSubmit(event){
        event.preventDefault();
        const ticksWithIDS = generateTicketIDs();
        const {request} = await axios.post('/init', {
            tickets: ticksWithIDS
        })
        const taskID = JSON.parse(request.response)["taskid"];
        console.log(taskID)
        setIDTickets(ticksWithIDS);
        setRequestID(taskID);
        setGettingInput(false);
    }

    function handleCreateTicketClick(items){
        createTicketFromInput(items)
    }

    function handleTicketClick(index){
        deleteTicketAtIndex(index);
    }

    function generateTicketIDs(){
        let ticketsWithID = {};
        for (let i = 0; i < tickets.length; i++){
            let id = uuidv4()
            ticketsWithID[id] = tickets[i]
        }
        return ticketsWithID
    }

    function createTicketFromInput(items){
        let updatedTickets = tickets.slice();
        updatedTickets.push(items);
        setTickets(updatedTickets)
    }

    function deleteTicketAtIndex(index){
        const updatedTickets = tickets.slice()
        updatedTickets.splice(index, 1)
        setTickets(updatedTickets)
    }

    function handleTicketFinish(){
        setNumFinishedTickets(numFinishedTickets + 1);
    }

    if(gettingInput){
        return (
            <div className="App">
                {header}
                <InputUI
                    requestTickets={tickets}
                    onInputSubmit={handleInputSubmit}
                    onCreateTicketClick={handleCreateTicketClick}
                    onTicketClick={handleTicketClick}
                />
            </div>
        )
    }else if(numFinishedTickets < tickets.length){
          return (
            <div className="App">
                {header}
                <RunningQueriesUI
                    tickets={idTickets}
                    onFinish={handleTicketFinish}
                    requestID={requestID}
                />
            </div>
          )
    }else{
        return (
            <div className="App">
                {header}
                <ResultUI
                    tickets={idTickets}
                />
            </div>
          )
    }
}



export default App;