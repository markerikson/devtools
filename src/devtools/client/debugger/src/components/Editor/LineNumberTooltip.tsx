import { PointDescription } from "@recordreplay/protocol";
import { isNumber } from "lodash";
import React, { useRef, useState, useEffect, ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setHoveredLineNumberLocation } from "ui/actions/app";
import { KeyModifiers } from "ui/components/KeyModifiers";
import MaterialIcon from "ui/components/shared/MaterialIcon";
import hooks from "ui/hooks";
import { Nag } from "ui/hooks/users";
import { selectors } from "ui/reducers";
import { prefs } from "ui/utils/prefs";
import { prefs as prefsService } from "devtools/shared/services";
import { trackEvent } from "ui/utils/telemetry";
import { shouldShowNag } from "ui/utils/user";
import { getHitCounts, getSelectedSource } from "../../reducers/sources";
import StaticTooltip from "./StaticTooltip";

const { runAnalysisOnLine } = require("devtools/client/debugger/src/actions/breakpoints/index");
const { setBreakpointHitCounts } = require("devtools/client/debugger/src/actions/sources");
const {
  updateHoveredLineNumber,
} = require("devtools/client/debugger/src/actions/breakpoints/index");

export const AWESOME_BACKGROUND = `linear-gradient(116.71deg, #FF2F86 21.74%, #EC275D 83.58%), linear-gradient(133.71deg, #01ACFD 3.31%, #F155FF 106.39%, #F477F8 157.93%, #F33685 212.38%), #007AFF`;

function getTextAndWarning(analysisPoints: number | PointDescription[] | "error") {
  if (analysisPoints === "error") {
    return { text: "10k+ hits", showWarning: false };
  }

  let points: Number;
  if (isNumber(analysisPoints)) {
    points = analysisPoints;
  } else {
    points = analysisPoints.length;
  }

  const text = `${points} hit${points == 1 ? "" : "s"}`;
  const showWarning = points > prefs.maxHitsDisplayed;
  return { text, showWarning };
}

function Wrapper({
  children,
  showWarning,
  loading,
}: {
  children: ReactNode;
  showWarning?: boolean;
  loading?: boolean;
}) {
  const { nags } = hooks.useGetUserInfo();
  const showNag = shouldShowNag(nags, Nag.FIRST_BREAKPOINT_ADD);

  if (showWarning) {
    return (
      <div className="static-tooltip-content space-x-2 bg-red-700">
        <MaterialIcon>warning_amber</MaterialIcon>
        <div>{children}</div>
      </div>
    );
  } else if (showNag) {
    return (
      <div className="static-tooltip-content space-x-2" style={{ background: AWESOME_BACKGROUND }}>
        <MaterialIcon iconSize="xl">auto_awesome</MaterialIcon>
        <div className="flex flex-col">
          {!loading ? <div className="font-bold">Click to add a print statement</div> : null}
          <div>{children}</div>
        </div>
      </div>
    );
  }

  return <div className="static-tooltip-content bg-gray-700">{children}</div>;
}

export default function LineNumberTooltip({
  editor,
  keyModifiers,
}: {
  editor: any;
  keyModifiers: KeyModifiers;
}) {
  const dispatch = useDispatch();
  const [targetNode, setTargetNode] = useState<HTMLElement | null>(null);
  const lastHoveredLineNumber = useRef<number | null>(null);
  const isMetaActive = keyModifiers.meta;

  const indexed = useSelector(selectors.getIndexed);
  const hitCounts = useSelector(getHitCounts);
  const source = useSelector(getSelectedSource);
  const analysisPoints = useSelector(selectors.getPointsForHoveredLineNumber);

  let analysisPointsCount: number | undefined;

  if (prefsService.getBoolPref("devtools.features.codeHeatMaps")) {
    analysisPointsCount =
      hitCounts && lastHoveredLineNumber.current
        ? hitCounts[lastHoveredLineNumber.current]
        : undefined;
  } else {
    analysisPointsCount = analysisPoints?.length;
  }

  const setHoveredLineNumber = ({
    lineNumber,
    lineNode,
  }: {
    lineNumber: number;
    lineNode: HTMLElement;
  }) => {
    // The gutter re-renders when we click the line number to add
    // a breakpoint. That triggers a second gutterLineEnter event
    // for the same line number. In that case, we shouldn't run
    // the analysis again.
    if (lineNumber !== lastHoveredLineNumber.current) {
      lastHoveredLineNumber.current = lineNumber;
    }
    if (prefsService.getBoolPref("devtools.features.codeHeatMaps")) {
      setTimeout(() => {
        if (lineNumber === lastHoveredLineNumber.current) {
          dispatch(setBreakpointHitCounts(source.id));
        }
      }, 200);
    } else {
      setTimeout(() => {
        if (lineNumber === lastHoveredLineNumber.current) {
          dispatch(runAnalysisOnLine(lineNumber));
        }
      }, 200);
    }

    dispatch(updateHoveredLineNumber(lineNumber));
    setTargetNode(lineNode);
  };
  const clearHoveredLineNumber = () => {
    setTargetNode(null);
    dispatch(setHoveredLineNumberLocation(null));
  };

  useEffect(() => {
    editor.codeMirror.on("lineMouseEnter", setHoveredLineNumber);
    editor.codeMirror.on("lineMouseLeave", clearHoveredLineNumber);
    return () => {
      editor.codeMirror.off("lineMouseEnter", setHoveredLineNumber);
      editor.codeMirror.off("lineMouseLeave", clearHoveredLineNumber);
    };
  }, []);

  useEffect(() => {
    if (analysisPointsCount) {
      trackEvent(
        analysisPointsCount ? "breakpoint.preview_has_hits" : "breakpoint.preview_no_hits"
      );
      trackEvent("breakpoint.preview_hits", { hitsCount: analysisPointsCount || null });
    }
  }, [analysisPointsCount]);

  if (!targetNode || isMetaActive) {
    return null;
  }

  if (!indexed || analysisPointsCount === undefined) {
    return (
      <StaticTooltip targetNode={targetNode}>
        <Wrapper loading>{!indexed ? "Indexing…" : "Loading…"}</Wrapper>
      </StaticTooltip>
    );
  }

  const { text, showWarning } = getTextAndWarning(analysisPointsCount);
  return (
    <StaticTooltip targetNode={targetNode}>
      <Wrapper showWarning={showWarning}>{text}</Wrapper>
    </StaticTooltip>
  );
}
