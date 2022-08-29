from math import ceil
import io
from lxml import etree

from .newspaper import Newspaper
from concurrent.futures import ThreadPoolExecutor
from .gallicaRecordBatch import GallicaKeywordRecordBatch
from .gallicaRecordBatch import GallicaRecordBatch

NUM_WORKERS = 50


class GallicaNgramOccurrenceQuery:

    def __init__(self,
                 searchTerm,
                 yearRange,
                 ticketID,
                 progressTracker,
                 dbConnection,
                 session):

        self.keyword = searchTerm
        self.lowYear = None
        self.highYear = None
        self.isYearRange = None
        self.baseQuery = None
        self.ticketID = ticketID
        self.estimateNumResults = 0
        self.progress = 0
        self.keywordRecords = []
        self.progressTracker = progressTracker
        self.dbConnection = dbConnection
        self.workChunks = []

        self.establishYearRange(yearRange)
        self.gallicaHttpSession = session
        self.buildQuery()
        self.fetchNumTotalResults()

    def generateWorkChunks(self):
        pass

    def buildYearRangeQuery(self):
        pass

    def buildDatelessQuery(self):
        pass

    def fetchNumTotalResults(self):
        pass

    def getKeyword(self):
        return self.keyword

    def getRecords(self):
        return self.keywordRecords

    def getEstimateNumResults(self):
        return self.estimateNumResults

    def establishYearRange(self, yearRange):
        if len(yearRange) == 2:
            self.lowYear = int(yearRange[0])
            self.highYear = int(yearRange[1])
            self.isYearRange = True
        else:
            self.isYearRange = False

    def buildQuery(self):
        if self.isYearRange:
            self.buildYearRangeQuery()
        else:
            self.buildDatelessQuery()

    def runSearch(self):
        self.generateWorkChunks()
        with self.gallicaHttpSession:
            self.doThreadedSearch()

    def doThreadedSearch(self):
        with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
            for recordBatch in executor.map(self.doSearchChunk, self.workChunks):
                recordsForIndex = recordBatch.getRecords()
                if recordsForIndex:
                    randomPaper = recordBatch.getRandomPaper()
                    self.progressTracker(
                        randomPaper,
                        recordBatch.elapsedTime,
                        NUM_WORKERS
                    )
                    self.keywordRecords.extend(recordsForIndex)
                else:
                    # TODO: Ensure there are always records?
                    print("No records for batch")

    def doSearchChunk(self, workChunk):
        return GallicaKeywordRecordBatch(self.gallicaHttpSession, workChunk)

class GallicaNgramOccurrenceQueryAllPapers(GallicaNgramOccurrenceQuery):

    def __init__(self,
                 searchTerm,
                 yearRange,
                 ticketID,
                 progressTracker,
                 dbConnection,
                 session):
        super().__init__(
            searchTerm,
            yearRange,
            ticketID,
            progressTracker,
            dbConnection,
            session)

    def buildYearRangeQuery(self):
        lowYear = str(self.lowYear)
        highYear = str(self.highYear)
        self.baseQuery = (
            f'dc.date >= "{lowYear}" '
            f'and dc.date <= "{highYear}" '
            f'and (gallica all "{self.keyword}") '
            'and (dc.type adj "fascicule") '
            'sortby dc.date/sort.ascending'
        )

    def buildDatelessQuery(self):
        self.baseQuery = (
            f'(gallica all "{self.keyword}") '
            'and (dc.type adj "fascicule") '
            'sortby dc.date/sort.ascending'
        )

    def fetchNumTotalResults(self):
        tempBatch = GallicaRecordBatch(
            self.baseQuery,
            self.gallicaHttpSession,
            numRecords=1)
        self.estimateNumResults = tempBatch.getNumResults()
        return self.estimateNumResults

    def doSearchChunk(self, index):
        batch = GallicaKeywordRecordBatch(
            self.baseQuery,
            self.gallicaHttpSession,
            startRecord=index)
        return batch

    def generateWorkChunks(self):
        iterations = ceil(self.estimateNumResults / 50)
        self.workChunks = [(i * 50) + 1 for i in range(iterations)]


class GallicaNgramOccurrenceQuerySelectPapers(GallicaNgramOccurrenceQuery):
    def __init__(self,
                 searchTerm,
                 papers,
                 yearRange,
                 ticketID,
                 progressTracker,
                 dbConnection,
                 session):

        self.papers = papers
        self.paperCodeWithNumResults = {}
        self.batchQueryStrings = []

        super().__init__(searchTerm,
                         yearRange,
                         ticketID,
                         progressTracker,
                         dbConnection,
                         session)

    def buildYearRangeQuery(self):
        lowYear = str(self.lowYear)
        highYear = str(self.highYear)
        self.baseQuery = (
            'arkPress adj "{newsKey}_date" '
            f'and dc.date >= "{lowYear}" '
            f'and dc.date <= "{highYear}" '
            f'and (gallica all "{self.keyword}") '
            'sortby dc.date/sort.ascending'
        )

    def buildDatelessQuery(self):
        self.baseQuery = (
            'arkPress adj "{newsKey}_date" '
            f'and (gallica all "{self.keyword}") '
            'sortby dc.date/sort.ascending'
        )

    def fetchNumTotalResults(self):
        self.setNumResultsForEachPaper()
        self.sumUpPaperResultsForTotalEstimate()

    def doSearchChunk(self, recordStartAndCode):
        recordStart = recordStartAndCode[0]
        code = recordStartAndCode[1]
        query = self.baseQuery.format(newsKey=code)
        batch = GallicaKeywordRecordBatch(
            query,
            self.gallicaHttpSession,
            startRecord=recordStart)
        return batch

    def recordsNotUnique(self, records):
        for record in records:
            for priorRecords in self.keywordRecords:
                if record.getUrl() == priorRecords.getUrl():
                    return True
        return False

    def generateWorkChunks(self):
        for paperCode, count in self.paperCodeWithNumResults.items():
            numBatches = ceil(count / 50)
            self.appendBatchQueryStringsForPaper(numBatches, paperCode)

    def appendBatchQueryStringsForPaper(self, numBatches, code):
        for i in range(numBatches):
            recordAndCode = [1 + 50 * i, code]
            self.workChunks.append(recordAndCode)

    def setNumResultsForEachPaper(self):
        with ThreadPoolExecutor(max_workers=10) as executor:
            for paperCode, numResults in executor.map(
                    self.fetchNumberResultsInPaper,
                    self.papers):
                self.paperCodeWithNumResults[paperCode] = numResults

    def fetchNumberResultsInPaper(self, paper):
        paperCode = paper["code"]
        numResultQuery = self.baseQuery.format(newsKey=paperCode)
        batch = GallicaRecordBatch(
            numResultQuery,
            self.gallicaHttpSession,
            numRecords=1)
        numResults = batch.getNumResults()
        return paperCode, numResults

    def sumUpPaperResultsForTotalEstimate(self):
        for paperCode, count in self.paperCodeWithNumResults.items():
            self.estimateNumResults += count
