from typing import Callable, List, Optional, Tuple

from gallicaGetter import WrapperFactory
from gallicaGetter.gallicaWrapper import VolumeOccurrenceWrapper
from gallicaGetter.parse.volumeRecords import VolumeRecord

ticketResultsWithPaperName = """
SELECT searchterm, papertitle, year, month, day, identifier
FROM results
WHERE ticketid in %(tickets)s
AND requestid = %(requestID)s
"""

countResultsSelect = """
SELECT COUNT(*)
FROM results
WHERE ticketid in %(tickets)s
AND requestid = %(requestID)s
"""


def select_csv_data_for_tickets(ticket_ids: int | List[int], request_id: int, conn):
    tupled_ids = tuple(ticket_ids) if isinstance(ticket_ids, list) else (ticket_ids,)
    with conn.cursor() as cur:
        cur.execute(
            f"""
        {ticketResultsWithPaperName}
        """,
            {"tickets": tupled_ids, "requestID": request_id},
        )
        data = cur.fetchall()
    row_labels = ["ngram", "identifier", "periodical", "year", "month", "day"]
    data.insert(0, row_labels)
    return data


def select_display_records(
    ticket_ids: List[int],
    request_id: int,
    conn,
    term: Optional[str] = None,
    periodical: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    day: Optional[int] = None,
    limit: int = 10,
    offset: int = 0,
) -> Tuple[List, int]:
    args = {
        "tickets": tuple(ticket_ids),
        "requestID": request_id,
        "limit": limit,
        "offset": offset,
    }
    if periodical:
        periodical = "%" + periodical.lower() + "%"
        args["periodical"] = periodical
    if term:
        args["searchterm"] = term
    if year:
        args["year"] = year
    if month:
        args["month"] = month
    if day:
        args["day"] = day
    selects = f"""
    {'AND year = %(year)s' if year else ''}
    {'AND month = %(month)s' if month else ''}
    {'AND day = %(day)s' if day else ''}
    {'AND searchterm = %(term)s' if term else ''}
    {'AND LOWER(papertitle) LIKE %(periodical)s' if periodical else ''}
    """
    limit_ordering_offset = f"""
    ORDER BY year, month, day
    LIMIT %(limit)s
    OFFSET %(offset)s
    """
    with conn.cursor() as cur:
        cur.execute(
            f"""
        {ticketResultsWithPaperName}
        {selects}
        {limit_ordering_offset}
        """,
            args,
        )
        records = cur.fetchall()

        cur.execute(
            f"""
        {countResultsSelect}
        {selects}
        """,
            args,
        )
        total = cur.fetchone()[0]

    return records, total


def make_date_from_year_mon_day(
    year: Optional[int], month: Optional[int], day: Optional[int]
) -> str:
    if year and month and day:
        return f"{year}-{month}-{day}"
    elif month:
        return f"{year}-{month}"
    elif year:
        return f"{year}"
    else:
        return ""


def get_gallica_records_for_display(
    terms: List[str],
    link_term: Optional[str],
    link_distance: Optional[int],
    year: Optional[int],
    month: Optional[int],
    day: Optional[int],
    codes: Optional[List[str]],
    limit: Optional[int],
    offset: Optional[int],
    on_get_total_records: Optional[Callable[[int], None]] = None,
) -> List[VolumeRecord]:
    wrapper = WrapperFactory.connect_volume()
    records = []
    records.extend(
        wrapper.get(
            terms=terms,
            start_date=make_date_from_year_mon_day(year, month, day),
            codes=codes,
            link_term=link_term,
            link_distance=link_distance,
            num_results=limit,
            start_index=offset,
            on_get_total_records=on_get_total_records,
        )
    )
    return records


def clear_records_for_requestid(requestID, conn):
    with conn.cursor() as cur:
        cur.execute(
            """
        DELETE FROM results
        WHERE requestid = %s
        """,
            (requestID,),
        )
