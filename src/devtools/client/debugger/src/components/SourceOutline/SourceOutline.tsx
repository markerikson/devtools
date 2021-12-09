import React, { useRef, useCallback, useMemo, useState, useEffect } from "react";
import classnames from "classnames";

import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import OutlineFilter from "../PrimaryPanes/OutlineFilter";
import { findClosestEnclosedSymbol } from "../../utils/ast";
import { SourceOutlineClass } from "./SourceOutlineClass";
import { SourceOutlineFunction } from "./SourceOutlineFunction";
import { getOutlineSymbols } from "./getOutlineSymbols";
import { FunctionSymbol, ClassSymbol } from "../../types";
import { connect, ConnectedProps } from "react-redux";
import { selectors } from "ui/reducers";
import { actions } from "ui/actions";
import { UIState } from "ui/state";
import Spinner from "ui/components/shared/Spinner";
import MaterialIcon from "ui/components/shared/MaterialIcon";

export function isFunctionSymbol(symbol: FunctionSymbol | ClassSymbol): symbol is FunctionSymbol {
  return "parameterNames" in symbol;
}

export function SourceOutline({
  cx,
  cursorPosition,
  selectedSource,
  symbols,
  selectLocation,
}: PropsFromRedux) {
  const [filter, setFilter] = useState("");
  const outlineSymbols = useMemo(() => getOutlineSymbols(symbols, filter), [symbols, filter]);
  const [focusedSymbol, setFocusedSymbol] = useState<ClassSymbol | FunctionSymbol | null>(null);
  const listRef = useRef<any>();

  const closestSymbolIndex = useMemo(() => {
    if (!cursorPosition) {
      return;
    }
    const symbol = findClosestEnclosedSymbol(symbols, cursorPosition);
    return outlineSymbols?.findIndex(a => a === symbol);
  }, [cursorPosition, outlineSymbols, symbols, listRef]);

  useEffect(() => {
    if (outlineSymbols && closestSymbolIndex) {
      const symbol = outlineSymbols[closestSymbolIndex];
      setFocusedSymbol(symbol);
      if (listRef.current) {
        listRef.current.scrollToItem(closestSymbolIndex, "center");
      }
    }
  }, [closestSymbolIndex]);

  const handleSelectSymbol = useCallback(
    (symbol: ClassSymbol | FunctionSymbol) => {
      selectLocation(cx, {
        sourceId: selectedSource.id,
        sourceUrl: selectedSource.url,
        line: symbol.location.start.line,
        column: symbol.location.start.column,
      });
      setFocusedSymbol(symbol);
    },
    [selectedSource, cx]
  );

  const MemoizedOutlineItem = useCallback(
    ({ index, style }: { index: number; style: Object }) => {
      const symbol = outlineSymbols![index];
      const isFocused = focusedSymbol === symbol;
      if (!symbol) {
        return null;
      }
      return (
        <div style={style}>
          {isFunctionSymbol(symbol) ? (
            <SourceOutlineFunction
              isFocused={isFocused}
              func={symbol}
              onSelect={handleSelectSymbol}
            />
          ) : (
            <SourceOutlineClass
              isFocused={isFocused}
              klass={symbol}
              onSelect={handleSelectSymbol}
            />
          )}
        </div>
      );
    },
    [handleSelectSymbol, outlineSymbols, focusedSymbol]
  );

  if (!selectedSource || !symbols) {
    return (
      <div className="onboarding-text p-3 space-y-3 text-gray-500 text-base whitespace-normal">
        <MaterialIcon className="large-icon">info</MaterialIcon>
        <p>{`Select a source to see available function.`}</p>
      </div>
    );
  }

  if (!symbols || symbols.loading) {
    return (
      <div className="flex p-4 justify-center">
        <Spinner className="animate-spin h-4 w-4 text-gray-500" />
      </div>
    );
  }

  if (!outlineSymbols || outlineSymbols.length == 0) {
    return (
      <div className={classnames("h-full flex flex-col")}>
        <OutlineFilter filter={filter} updateFilter={setFilter} />
        <div className="onboarding-text p-3 space-y-3 text-gray-500 text-base whitespace-normal">
          <p>{`No functions were found.`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={classnames("h-full flex flex-col")}>
      <OutlineFilter filter={filter} updateFilter={setFilter} />
      <div className="outline-list flex-grow my-1">
        <AutoSizer>
          {({ height, width }) => {
            const list = (
              <List
                innerElementType="ol"
                height={height}
                width={width}
                itemCount={outlineSymbols.length}
                itemSize={24}
                ref={listRef}
              >
                {MemoizedOutlineItem}
              </List>
            );

            return list;
          }}
        </AutoSizer>
      </div>
    </div>
  );
}

const mapStateToProps = (state: UIState) => {
  const selectedSource = selectors.getSelectedSourceWithContent(state);
  const symbols = selectedSource ? selectors.getSymbols(state, selectedSource) : null;
  return {
    cx: selectors.getContext(state),
    symbols,
    selectedSource: selectedSource,
    cursorPosition: selectors.getCursorPosition(state),
  };
};

const connector = connect(mapStateToProps, {
  selectLocation: actions.selectLocation,
});

type PropsFromRedux = ConnectedProps<typeof connector>;
export default connector(SourceOutline);