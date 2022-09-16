class PaperRecord:

    def __init__(self, code, title, url):
        self.code = code
        self.title = title
        self.url = url
        self.publishingYears = []

    def __repr__(self):
        return f'PaperRecord({self.code}, {self.title}, {self.url})'

    def getRow(self):
        if self.publishingYears:
            startYear = self.publishingYears[0]
            endYear = self.publishingYears[-1]
        else:
            startYear = None
            endYear = None
        return (
            self.title,
            startYear,
            endYear,
            self.isContinuous(),
            self.code
        )

    def isContinuous(self):
        if self.publishingYears:
            return int(self.publishingYears[-1]) - int(self.publishingYears[0]) + 1 == len(self.publishingYears)
        else:
            return False




