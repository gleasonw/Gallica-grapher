import datetime
import ciso8601
from db import DB


# TODO: test with continuous settings
class TicketGraphSeriesBatch:

    def __init__(self, settings):
        self.dbConnection = DB().getConn()
        self.dataBatches = []
        self.settings = settings
        self.requestIDs = settings["ticketIDs"].split(",")
        self.selectGraphSeries()

    def getSeries(self):
        dataBatchesDict = {}
        for dataBatch in self.dataBatches:
            requestID = dataBatch[0]
            series = dataBatch[1]
            dataBatchesDict[requestID] = series
        return dataBatchesDict

    def selectGraphSeries(self):
        self.dataBatches = list(map(
            self.selectDataForRequestID,
            self.requestIDs))
        self.dbConnection.close()

    def selectDataForRequestID(self, requestID):
        series = TicketGraphSeries(
            requestID,
            self.settings,
            self.dbConnection)
        return [requestID, series.getSeries()]


def parseContinuous(cont):
    if cont.lower() == "true":
        return True
    else:
        return False


class TicketGraphSeries:

    def __init__(self,
                 requestid,
                 settings,
                 dbConnection):

        self.continuous = parseContinuous(settings["continuous"])
        self.requestID = requestid
        self.averageWindow = int(settings["averageWindow"])
        self.timeBin = settings["groupBy"]
        dateRange = settings["dateRange"].split(",")
        self.lowYear = dateRange[0]
        self.highYear = dateRange[1]
        self.data = []
        self.searchTerms = []
        self.request = None

        self.dbConnection = dbConnection
        self.makeSeries()

    def getSeries(self):
        return {
            'name': self.searchTerms,
            'data': self.data
        }

    def makeSeries(self):
        self.buildQueryForGraphData()
        self.runQuery()

    def buildQueryForGraphData(self):
        if self.timeBin == "day":
            self.initDayRequest()
        elif self.timeBin == "month":
            self.initMonthRequest()
        else:
            self.initYearRequest()

    def initDayRequest(self):
        self.request = """
        
        WITH binned_frequencies AS (
            SELECT year, month, day, count(*) AS mentions 
            FROM results 
            WHERE requestid = %s 
                AND month IS NOT NULL
                AND day IS NOT NULL
            GROUP BY year, month, day 
            ORDER BY year, month, day),
            
            averaged_frequencies AS (
            SELECT year, month, day, 
                    AVG(mentions) OVER(ROWS BETWEEN %s PRECEDING AND CURRENT ROW) AS avgFrequency
            FROM binned_frequencies)
            
        SELECT year, month, day, avgFrequency::numeric
            FROM averaged_frequencies;
                
        """

    def initDayContinuousPaperRequest(self):
        self.request = """
        
        WITH ticket_results AS 
            (SELECT year, month, day, paperid
            FROM results 
            WHERE requestid=%s
                AND month IS NOT NULL 
                AND day IS NOT NULL),
        
            binned_results_only_continuous AS 
            (SELECT year, month, day, count(*) AS mentions 
            FROM 
                ticket_results
                    
                JOIN papers 
                ON ticket_results.paperid = papers.code
                    AND papers.startdate < %s
                    AND papers.enddate > %s
                    AND continuous IS TRUE
                GROUP BY year, month, day 
                ORDER BY year, month, day),
                
            averaged_frequencies AS 
            (SELECT year, month, day, 
                AVG(mentions) OVER(ROWS BETWEEN %s PRECEDING AND CURRENT ROW) AS avgFrequency
            FROM binned_results_only_continuous)
        
        SELECT year, month, day, avgFrequency::numeric
        FROM averaged_frequencies;
        """

    def initMonthRequest(self):
        self.request = """
        WITH binned_frequencies AS
            (SELECT year, month, count(*) AS mentions 
                    FROM results continuous
                        WHERE requestid = %s 
                            AND month IS NOT NULL
                    GROUP BY year, month
                    ORDER BY year,month),
        
            averaged_frequencies AS 
            (SELECT year, month, 
                    AVG(mentions) OVER(ROWS BETWEEN %s PRECEDING AND CURRENT ROW) AS avgFrequency
            FROM binned_frequencies)
        
        SELECT year, month, avgFrequency::numeric 
        FROM averaged_frequencies;
        """

    def initMonthContinuousPaperRequest(self):
        self.request = """
        WITH ticket_results AS
            (SELECT year, month, paperid
            FROM results 
            WHERE requestid=%s
                AND month IS NOT NULL),
                
            binned_frequencies_only_continuous AS
                (SELECT year, month, count(*) AS mentions 
                FROM 
                    ticket_results

                    JOIN papers 
                    ON ticket_results.paperid = papers.code
                        AND papers.startdate < %s
                        AND papers.enddate > %s
                        AND continuous IS TRUE
                GROUP BY year, month
                ORDER BY year, month),
                
            averaged_frequencies AS
                (SELECT year, month, 
                    AVG(mentions) OVER(ROWS BETWEEN %s PRECEDING AND CURRENT ROW) AS avgFrequency
                FROM binned_frequencies_only_continuous)
                
        SELECT year, month, avgFrequency::numeric
        FROM averaged_frequencies;
        """

    def initYearRequest(self):
        self.request = """
        WITH binned_frequencies AS
            (SELECT year, count(*) AS mentions 
            FROM results 
            WHERE requestid = %s
                AND year IS NOT NULL
            GROUP BY year 
            ORDER BY year),
            
            averaged_frequencies AS
            (SELECT year, 
                    AVG(mentions) OVER(ROWS BETWEEN %s PRECEDING AND CURRENT ROW) AS avgFrequency
            FROM binned_frequencies)
            
        SELECT year, avgFrequency::numeric
        FROM averaged_frequencies;
        """

    def initYearContinuousPaperRequest(self):
        self.request = """
        WITH ticket_results AS
            (SELECT year, paperid
            FROM results 
            WHERE requestid=%s),
            
            binned_frequencies_only_continuous AS
            (SELECT year, count(*) AS mentions 
            FROM 
                ticket_results

                JOIN papers 
                ON ticket_results.paperid = papers.code
                    AND papers.startdate < %s
                    AND papers.enddate > %s
                    AND continuous IS TRUE
                GROUP BY year
                ORDER BY year),
                
            averaged_frequencies AS
            (SELECT year,
                AVG(mentions) OVER(ROWS BETWEEN %s PRECEDING AND CURRENT ROW) AS avgFrequency
            FROM binned_frequencies_only_continuous)
                
        SELECT year, avgFrequency::numeric
        FROM averaged_frequencies;
        """

    def runQuery(self):
        self.getSearchTerms()
        self.binRecordsAndFetch()
        self.parseDatesToJSTimestamp()

    def getSearchTerms(self):
        getSearchTerms = """
        SELECT array_agg(DISTINCT searchterm) FROM results WHERE requestid = %s;
        """
        cursor = self.dbConnection.cursor()
        cursor.execute(getSearchTerms, (self.requestID,))
        self.searchTerms = cursor.fetchone()[0]

    def binRecordsAndFetch(self):
        with self.dbConnection.cursor() as curs:
            if self.continuous:
                curs.execute(
                    self.request,
                    (self.requestID,
                     self.averageWindow,
                     self.lowYear,
                     self.highYear
                     ))
            else:
                curs.execute(
                    self.request,
                    (self.requestID,
                     self.averageWindow,))
            self.data = curs.fetchall()
#TODO: store this in the database instead of computing it repeatedly on demand
    def parseDatesToJSTimestamp(self):

        def makeMonthTwoDigits(month):
            if month < 10:
                month = f'0{month}'
            return month

        def makeDayTwoDigits(day):
            if day < 10:
                day = f'0{day}'
            return day

        def dateToTimestamp(date):
            dateObject = ciso8601.parse_datetime(date)
            timestamp = datetime.datetime.timestamp(dateObject) * 1000
            return timestamp

        # Dummy day added to simplify Highcharts comparison.
        def parseYearMonRecord(record):
            year = record[0]
            month = makeMonthTwoDigits(record[1])
            freq = record[2]
            JStimestamp = dateToTimestamp(f"{year}-{month}-01")
            return [
                JStimestamp,
                freq
            ]

        def parseYearMonDayRecord(record):
            year = record[0]
            month = makeMonthTwoDigits(record[1])
            day = makeDayTwoDigits(record[2])
            freq = record[3]
            JStimestamp = dateToTimestamp(f"{year}-{month}-{day}")
            return [
                JStimestamp,
                freq
            ]

        if self.timeBin == 'year':
            dataWithTimestamps = self.data
        elif self.timeBin == 'month':
            dataWithTimestamps = list(map(
                parseYearMonRecord,
                self.data
            ))
        else:
            dataWithTimestamps = list(map(
                parseYearMonDayRecord,
                self.data
            ))
        self.data = dataWithTimestamps
