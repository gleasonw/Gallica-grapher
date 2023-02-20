import asyncio
from typing import Generator, List, Tuple
from pydantic import BaseModel
from gallicaGetter.queries import ContentQuery
from gallicaGetter.utils.parse_xml import get_num_results_and_pages_for_context
from gallicaGetter.gallicaWrapper import GallicaWrapper
from dataclasses import dataclass
import aiohttp


class GallicaPage(BaseModel):
    page: str
    context: str


class HTMLContext(BaseModel):
    num_results: int
    pages: List[GallicaPage]
    ark: str


class ContextWrapper(GallicaWrapper):
    """Wrapper for Gallica's ContentSearch API."""

    def parse(self, gallica_responses):
        for response in gallica_responses:
            num_results_and_pages = get_num_results_and_pages_for_context(response.xml)
            yield HTMLContext(
                num_results=num_results_and_pages[0],
                pages=[
                    GallicaPage(page=occurrence[0], context=occurrence[1])
                    for occurrence in num_results_and_pages[1]
                ],
                ark=response.query.ark,
            )

    def get_endpoint_url(self):
        return "https://gallica.bnf.fr/services/ContentSearch"

    async def get(
        self,
        context_pairs: List[Tuple[str, List[str]]],
        generate=False,
        session: aiohttp.ClientSession | None = None,
        semaphore: asyncio.Semaphore | None = None,
    ) -> Generator[HTMLContext, None, None]:
        if session is None:
            async with aiohttp.ClientSession() as session:
                return await self.get(context_pairs, generate, session)
        queries = [
            ContentQuery(ark=pair[0], terms=pair[1], endpoint_url=self.endpoint_url)
            for pair in context_pairs
        ]
        return await self.get_records_for_queries(queries=queries, session=session, semaphore=semaphore)
