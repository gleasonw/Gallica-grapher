import {
  ResultsTable,
  TableProps,
  fetchContext,
} from "../../components/ResultsTable";
import React from "react";
import { YearRangeInput } from "..";
import DashboardLayout from "../../components/DashboardLayout";
import InputBubble from "../../components/InputBubble";
import { LangContext } from "../../components/LangContext";
import { PaperSelector } from "../../components/PaperSelector";
import { SelectInput } from "../../components/SelectInput";
import { SubInputLayout } from "../../components/SubInputLayout";
import link from "./link.svg";
import Image from "next/image";
import {
  SearchPageState,
  searchStateReducer,
} from "../../components/SearchStateReducer";
import NavBar from "../../components/NavBar";
import {
  SearchPageDispatchContext,
  SearchPageStateContext,
} from "../../components/SearchContext";
import { z } from "zod";
import { GallicaResponse } from "../../models/dbStructs";
import { useQueryClient } from "@tanstack/react-query";

const searchPageState = z.object({
  terms: z.string(),
  year: z.coerce.number().nullish(),
  end_year: z.coerce.number().nullish(),
  day: z.coerce.number().nullish(),
  source: z
    .literal("book")
    .or(z.literal("periodical"))
    .or(z.literal("all"))
    .nullish(),
  link_term: z.string().nullish(),
  link_distance: z.coerce.number().nullish(),
  codes: z.string().array().nullish(),
  limit: z.coerce.number().nullish(),
  sort: z.literal("date").or(z.literal("relevance")).nullish(),
  cursor: z.number().nullish(),
});

export const getServerSideProps = async ({ query }: { query: any }) => {
  const result = searchPageState.safeParse(query);
  let initRecords: GallicaResponse | null = null;
  if (result.success) {
    initRecords = await fetchContext(0, {
      terms: [result.data.terms],
      yearRange: [
        result.data.year ?? undefined,
        result.data.end_year ?? undefined,
      ],
      source: result.data.source ?? "all",
      link_term: result.data.link_term ?? undefined,
      link_distance: result.data.link_distance ?? undefined,
      codes: result.data.codes ?? undefined,
      limit: result.data.limit ?? 10,
      sort: result.data.sort ?? "relevance",
    });
  }

  return {
    props: {
      query: query,
      initRecords,
    },
  };
};

export default function Context({
  query,
  initRecords,
}: {
  query: any;
  initRecords: GallicaResponse | undefined;
}) {
  let initParams: SearchPageState;

  const result = searchPageState.safeParse(query);
  if (result.success) {
    initParams = {
      terms: result.data.terms,
      papers: undefined,
      source: result.data.source ?? undefined,
      limit: result.data.limit ?? undefined,
      cursor: result.data.cursor ?? undefined,
      yearRange: result.data.year
        ? [result.data.year, result.data.end_year ?? undefined]
        : [undefined, undefined],
      sort: result.data.sort ?? undefined,
      linkTerm: result.data.link_term ?? undefined,
      linkDistance: result.data.link_distance ?? undefined,
    };
  } else {
    initParams = {
      terms: "",
      papers: undefined,
      source: undefined,
      limit: undefined,
      cursor: undefined,
      yearRange: undefined,
      sort: undefined,
      linkTerm: undefined,
      linkDistance: undefined,
    };
  }
  const [searchState, searchStateDispatch] = React.useReducer(
    searchStateReducer,
    initParams
  );

  return (
    <SearchPageStateContext.Provider value={searchState}>
      <SearchPageDispatchContext.Provider value={searchStateDispatch}>
        <NavBar />
        <SearchableContext initRecords={initRecords} initParams={initParams} />
      </SearchPageDispatchContext.Provider>
    </SearchPageStateContext.Provider>
  );
}

const strings = {
  fr: {
    title: "The Gallica Grapher",
    description:
      "Explorez les occurrences de mots dans des périodiques Gallica.",
    linkTerm: "Terme de proximité",
    linkDistance: "Distance de proximité",
  },
  en: {
    title: "The Gallica Grapher",
    description: "Explore word occurrences in archived Gallica periodicals.",
    linkTerm: "Link term",
    linkDistance: "Link distance",
  },
};

function SearchableContext(props: {
  initRecords?: GallicaResponse;
  initParams: SearchPageState;
}) {
  const searchState = React.useContext(SearchPageStateContext);
  const searchStateDispatch = React.useContext(SearchPageDispatchContext);

  if (!searchState || !searchStateDispatch) {
    throw new Error("Search state not initialized");
  }
  const {
    yearRange,
    source,
    papers,
    limit,
    linkTerm,
    linkDistance,
    sort,
    terms: term,
    tableFetchParams,
  } = searchState;

  function handleSubmit() {
    if (!term || !searchState) {
      return;
    }
    const params = new URLSearchParams();
    const searchStateKeys = Object.keys(searchState) as Array<
      keyof SearchPageState
    >;
    for (const key of searchStateKeys) {
      if (
        key === "papers" ||
        key === "yearRange" ||
        key === "tableFetchParams"
      ) {
        continue;
      }
      if (searchState[key] !== "" && searchState[key] !== undefined) {
        const stringified = searchState[key]?.toString();
        if (stringified) {
          params.append(key, stringified);
        }
      }
    }
    if (searchState.yearRange) {
      const [start, end] = searchState.yearRange;
      if (start) {
        params.append("year", start.toString());
      }
      if (end) {
        params.append("end_year", end.toString());
      }
    }
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`
    );
    const newProps: TableProps = {
      limit,
      codes: papers?.map((paper) => paper.code),
      link_distance: linkDistance,
      link_term: linkTerm,
      sort,
      source,
      terms: [term],
      yearRange,
    };
    searchStateDispatch!({
      type: "set_table_props",
      payload: newProps,
    });
  }

  return (
    <>
      <DashboardLayout>
        <div
          className={
            "w-full flex flex-col justify-center gap-10 items-center rounded-lg pt-5 pb-5"
          }
        >
          <InputBubble
            word={term}
            onWordChange={(word) =>
              searchStateDispatch({
                type: "set_terms",
                payload: word,
              })
            }
            onSubmit={handleSubmit}
          >
            <button
              className="bg-blue-700 text-sm pl-5 pr-5 hover:bg-blue-500 text-white absolute top-4 right-5 rounded-full p-3 shadow-md"
              onClick={handleSubmit}
            >
              Explore
            </button>
          </InputBubble>
          <div className={"flex flex-wrap gap-10 justify-center"}>
            <SubInputLayout>
              <YearRangeInput
                min={1500}
                max={2023}
                value={yearRange}
                showLabel={true}
                onChange={(value) =>
                  searchStateDispatch({
                    type: "set_context_range",
                    payload: value,
                  })
                }
              />
            </SubInputLayout>
            <SubInputLayout>
              <SelectInput
                label={"corpus"}
                options={["book", "periodical", "all"]}
                value={source}
                onChange={(new_source) => {
                  if (
                    new_source === "book" ||
                    new_source === "periodical" ||
                    new_source === "all"
                  ) {
                    searchStateDispatch({
                      type: "set_source",
                      payload: new_source,
                    });
                  }
                }}
              />
              {source === "periodical" && (
                <PaperSelector
                  papers={papers}
                  from={yearRange?.[0]}
                  to={yearRange?.[1]}
                  onPaperAdd={(new_paper) =>
                    searchStateDispatch({
                      type: "add_paper",
                      payload: new_paper,
                    })
                  }
                  onPaperClick={(paperCode) => {
                    searchStateDispatch({
                      type: "remove_paper",
                      payload: paperCode.code,
                    });
                  }}
                />
              )}
            </SubInputLayout>
            <SubInputLayout>
              <SelectInput
                label={"sort"}
                value={sort}
                options={["date", "relevance"]}
                onChange={(new_sort) => {
                  if (new_sort === "date" || new_sort === "relevance") {
                    searchStateDispatch({
                      type: "set_sort",
                      payload: new_sort,
                    });
                  }
                }}
              />
              <SelectInput
                label={"limit"}
                value={limit}
                options={[10, 20, 50]}
                onChange={(lim) => {
                  const new_limit = parseInt(lim);
                  if (typeof new_limit === "number") {
                    searchStateDispatch({
                      type: "set_limit",
                      payload: new_limit,
                    });
                  }
                }}
              />
            </SubInputLayout>
          </div>
          <div
            className={
              !term || term.includes(" ")
                ? "opacity-0 transition-opacity duration-500"
                : "opacity-100 transition-opacity duration-500"
            }
          >
            <ProximitySearchInput
              linkTerm={linkTerm}
              linkDistance={linkDistance}
              onSetLinkDistance={(new_distance) =>
                searchStateDispatch({
                  type: "set_link_distance",
                  payload: new_distance,
                })
              }
              onSetLinkTerm={(new_term) =>
                searchStateDispatch({
                  type: "set_link_term",
                  payload: new_term,
                })
              }
            />
          </div>
        </div>
      </DashboardLayout>
      {tableFetchParams ? (
        <ResultsTable {...{ ...tableFetchParams, all_context: true }} />
      ) : (
        <ResultsTable
          {...{
            ...props.initParams,
            initialRecords: props.initRecords,
            terms: [props.initParams.terms],
          }}
        />
      )}
    </>
  );
}

function ProximitySearchInput(props: {
  onSetLinkTerm: (linkTerm: string) => void;
  onSetLinkDistance: (linkDistance?: number) => void;
  linkTerm?: string;
  linkDistance?: number;
}) {
  const { lang } = React.useContext(LangContext);
  const translation = strings[lang];
  return (
    <div className="flex flex-wrap gap-5">
      <input
        type="text"
        value={props.linkTerm}
        onChange={(e) => props.onSetLinkTerm(e.target.value)}
        className={"border p-2 rounded-lg shadow-sm"}
        placeholder={translation.linkTerm}
      />
      <Image src={link} alt={"proximity search icon"} width={30} height={30} />
      <input
        type="number"
        value={props.linkDistance}
        onChange={(e) => {
          const numVal = parseInt(e.target.value);
          if (typeof numVal === "number" && !isNaN(numVal) && numVal >= 0) {
            props.onSetLinkDistance(numVal);
          } else if (e.target.value === "") {
            props.onSetLinkDistance(undefined);
          }
        }}
        className={"border p-2 rounded-lg shadow-sm"}
        placeholder={translation.linkDistance}
      />
    </div>
  );
}
