import { ContextProps } from "./OCRTable";
import { Paper } from "./models/dbStructs";
export interface SearchPageState {
  terms?: string;
  papers?: Paper[];
  source?: "book" | "periodical" | "all";
  limit?: number;
  cursor?: number;
  yearRange?: [number?, number?];
  month?: number;
  sort?: "date" | "relevance";
  link_term?: string;
  link_distance?: number;
  tableFetchParams?: ContextProps;
}
export interface AddPaperAction {
  type: "add_paper";
  payload: Paper;
}

export interface RemovePaperAction {
  type: "remove_paper";
  payload: Paper["code"];
}

export interface SetSourceAction {
  type: "set_source";
  payload: SearchPageState["source"];
}

export interface SetLimitAction {
  type: "set_limit";
  payload: SearchPageState["limit"];
}

export interface SetCursorAction {
  type: "set_cursor";
  payload: SearchPageState["cursor"];
}

export interface SetYearRangeAction {
  type: "set_context_range";
  payload: SearchPageState["yearRange"];
}

export interface SetSortAction {
  type: "set_sort";
  payload: SearchPageState["sort"];
}

export interface SetLinkTermAction {
  type: "set_link_term";
  payload: SearchPageState["link_term"];
}

export interface SetLinkDistanceAction {
  type: "set_link_distance";
  payload: SearchPageState["link_distance"];
}

export interface SetTermsAction {
  type: "set_terms";
  payload: SearchPageState["terms"];
}

export interface SetTablePropsAction {
  type: "set_table_props";
  payload: SearchPageState["tableFetchParams"];
}

export interface ResetToInitialStateAction {
  type: "reset_to_initial_state";
  payload: SearchPageState;
}

export function searchStateReducer(
  state: SearchPageState,
  action:
    | AddPaperAction
    | RemovePaperAction
    | SetSourceAction
    | SetLimitAction
    | SetCursorAction
    | SetYearRangeAction
    | SetSortAction
    | SetLinkTermAction
    | SetLinkDistanceAction
    | SetTermsAction
    | SetTablePropsAction
    | ResetToInitialStateAction
): SearchPageState {
  switch (action.type) {
    case "add_paper":
      return {
        ...state,
        papers: state.papers
          ? [...state.papers, action.payload]
          : [action.payload],
      };
    case "remove_paper":
      return {
        ...state,
        papers: state.papers?.filter((p) => p.code !== action.payload),
      };
    case "set_source":
      return {
        ...state,
        source: action.payload,
      };
    case "set_limit":
      return {
        ...state,
        limit: action.payload,
      };
    case "set_cursor":
      return {
        ...state,
        cursor: action.payload,
      };
    case "set_context_range":
      return {
        ...state,
        yearRange: action.payload,
      };
    case "set_sort":
      return {
        ...state,
        sort: action.payload,
      };

    case "set_link_term":
      return {
        ...state,
        link_term: action.payload,
      };
    case "set_link_distance":
      return {
        ...state,
        link_distance: action.payload,
      };
    case "set_terms":
      return {
        ...state,
        terms: action.payload,
      };
    case "set_table_props":
      return {
        ...state,
        tableFetchParams: action.payload,
      };
    case "reset_to_initial_state":
      return action.payload;
  }
}
