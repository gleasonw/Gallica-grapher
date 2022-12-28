import threading
from dataclasses import dataclass
from typing import List, Optional, Tuple, Callable

import gallicaGetter
from gallicaGetter.fetch.occurrenceQuery import OccurrenceQuery
from gallicaGetter.parse.parseXML import get_one_paper_from_record_batch
from search import get_and_insert_records_for_args
from ticket import Ticket

RECORD_LIMIT = 1000000
MAX_DB_SIZE = 10000000


class Request(threading.Thread):
    def __init__(self, identifier: int, tickets: List[Ticket], conn):
        self.numResultsDiscovered = 0
        self.state = 'RUNNING'
        self.requestID = identifier
        self.tickets = tickets
        self.progress_stats = {
            ticket.id: SearchProgressStats(
                ticketID=ticket.id,
                grouping=ticket.grouping
            )
            for ticket in self.tickets
        }
        self.conn = conn
        self.num_records = 0
        super().__init__()

    def get_progress_stats(self):
        return {
            ticket.id: self.progress_stats[ticket.id].to_dict()
            for ticket in self.tickets
        }

    def set_total_records_for_ticket_progress(self, ticket_id: int, total_records: int):
        self.progress_stats[ticket_id].total_items = total_records

    def run(self):
        db_space_remaining = MAX_DB_SIZE - self.get_number_rows_in_db() - 10000
        self.num_records, self.tickets = get_num_records_for_args(
            self.tickets,
            onNumRecordsFound=self.set_total_records_for_ticket_progress,
        )
        if self.num_records == 0:
            self.state = 'NO_RECORDS'
        elif self.num_records > min(db_space_remaining, RECORD_LIMIT):
            self.state = 'TOO_MANY_RECORDS'
        else:
            for ticket in self.tickets:

                # Ensure number of periods is less than number of requests to send for all occurrences
                if ticket.codes and ticket.grouping in ['year', 'month']:
                    num_volume_occurrences = sum(
                        query.num_results for query in get_num_records_all_volume_occurrence(ticket)
                    )
                    if self.progress_stats[ticket.id].total_items > (num_volume_occurrences // 50) + 1:
                        self.progress_stats[ticket.id].grouping = 'all'
                        switched_all_ticket = Ticket(
                            terms=ticket.terms,
                            start_date=ticket.start_date,
                            end_date=ticket.end_date,
                            codes=ticket.codes,
                            grouping='all',
                            link_term=ticket.link_term,
                            link_distance=ticket.link_distance,
                        )

                get_and_insert_records_for_args(
                    ticketID=ticket.id,
                    requestID=self.requestID,
                    args=ticket,
                    onProgressUpdate=self.progress_stats[ticket.id].update_progress,
                    onAddingMissingPapers=lambda: self.progress_stats[ticket.id].set_search_state(
                        'ADDING_MISSING_PAPERS'),
                    conn=self.conn
                )
                self.progress_stats[ticket.id].search_state = 'COMPLETED'

            self.state = 'COMPLETED'

    def get_number_rows_in_db(self):
        with self.conn.cursor() as curs:
            curs.execute(
                """
                SELECT sum(reltuples)::bigint AS estimate
                FROM pg_class
                WHERE relname IN ('results', 'papers');
                """
            )
            return curs.fetchone()[0]


# TODO: if num records too low, switch to volume search instead of period search
def get_num_records_for_args(
        tickets: List[Ticket],
        onNumRecordsFound: Optional[Callable[[int, int], None]] = None
) -> Tuple[int, List[Ticket]]:
    total_records = 0
    cachable_responses = {}
    for ticket in tickets:
        if ticket.grouping == 'all':
            base_queries_with_num_results = get_num_records_all_volume_occurrence(ticket)
            total_records += sum(query.num_results for query in base_queries_with_num_results)
            cachable_responses.update({ticket.id: base_queries_with_num_results})
        else:
            total_records += get_num_periods_in_range_for_grouping(
                grouping=ticket.grouping,
                start=ticket.start_date,
                end=ticket.end_date
            )
        onNumRecordsFound and onNumRecordsFound(ticket.id, total_records)
    if cachable_responses:
        # create new args for args with cached responses
        new_args_for_tickets = {}
        for ticket in tickets:
            if cached_queries := cachable_responses.get(ticket.id):
                new_args_for_tickets[ticket.id] = Ticket(
                    terms=ticket.terms,
                    start_date=ticket.start_date,
                    end_date=ticket.end_date,
                    codes=ticket.codes,
                    grouping=ticket.grouping,
                    link_term=ticket.link_term,
                    link_distance=ticket.link_distance,
                    query_cache=cached_queries
                )
            else:
                new_args_for_tickets[ticket.id] = ticket
        tickets = new_args_for_tickets
    return total_records, tickets


def get_num_periods_in_range_for_grouping(grouping: str, start: str, end: str) -> int:
    start, end = int(start), int(end)
    if grouping == 'year':
        return end - start + 1
    elif grouping == 'month':
        return (end - start + 1) * 12
    else:
        raise ValueError(f'Invalid grouping: {grouping}')


def get_num_records_all_volume_occurrence(args: Ticket) -> List[OccurrenceQuery]:
    api = gallicaGetter.connect('volume')
    base_queries_with_num_results = api.get_num_results_for_args(
        terms=args.terms,
        start_date=args.start_date,
        end_date=args.end_date,
        codes=args.codes,
        link_term=args.link_term,
        link_distance=args.link_distance,
    )
    return base_queries_with_num_results


@dataclass(slots=True)
class SearchProgressStats:
    ticketID: int
    grouping: str
    num_items_fetched: int = 0
    total_items: int = 0
    average_response_time: float = 0
    estimate_seconds_to_completion: Optional[float] = None
    randomPaper: Optional[str] = None
    search_state: str = 'PENDING'

    def set_search_state(self, state: str):
        self.search_state = state

    def to_dict(self):
        return {
            'numResultsDiscovered': self.total_items,
            'numResultsRetrieved': self.num_items_fetched,
            'progressPercent': self.total_items and (self.num_items_fetched / self.total_items) * 100 or 0,
            'estimateSecondsToCompletion': self.estimate_seconds_to_completion,
            'randomPaper': self.randomPaper,
            'randomText': None,
            'state': self.search_state,
            'grouping': self.grouping,
        }

    def update_progress(
            self,
            elapsed_time,
            num_workers,
            xml
    ):
        if self.search_state == 'PENDING':
            self.search_state = 'RUNNING'

        # all search items measured in records, other searches in requests fetched. a bit confusing, maybe.
        if self.grouping == 'all':
            self.num_items_fetched += 50
        else:
            self.num_items_fetched += 1

        # estimate number of seconds to completion
        num_remaining_cycles = (self.total_items - self.num_items_fetched) / num_workers
        if self.grouping == 'all':
            num_remaining_cycles /= 50

        if self.average_response_time:
            self.average_response_time = (self.average_response_time + elapsed_time) / 2
        else:
            self.average_response_time = elapsed_time

        # a bit of reader fluff to make the wait enjoyable
        self.randomPaper = get_one_paper_from_record_batch(xml)
        self.estimate_seconds_to_completion = self.average_response_time * num_remaining_cycles


if __name__ == '__main__':
    import time
    from database.connContext import build_db_conn

    with build_db_conn() as conn:
        test_request = Request(
            identifier=1,
            arg_bundles={
                0: {
                    'terms': 'brazza',
                    'startDate': '1880',
                    'endDate': '1930',
                    'grouping': 'all'
                },
            },
            conn=conn
        )
        test_request.start()
        while test_request.is_alive():
            print(test_request.get_progress_stats())
            time.sleep(1)
