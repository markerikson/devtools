import React from "react";
import { Editor } from "codemirror";
import useAutocomplete from "./useAutocomplete";
import { isTest } from "ui/utils/environment";
import AutocompleteMatches from "./AutocompleteMatches";
import ControlledCodeMirror from "./ControlledCodeMirror";
import { getCursorIndex, getRemainingCompletedTextAfterCursor } from "ui/utils/autocomplete";

export enum Keys {
  BACKSPACE = "Backspace",
  ENTER = "Enter",
  ESCAPE = "Escape",
  TAB = "Tab",
  ARROW_DOWN = "ArrowDown",
  ARROW_UP = "ArrowUp",
  ARROW_RIGHT = "ArrowRight",
  ARROW_LEFT = "ArrowLeft",
}

const DISMISS_KEYS = [
  Keys.BACKSPACE,
  Keys.ENTER,
  Keys.TAB,
  Keys.ESCAPE,
  Keys.ARROW_RIGHT,
  Keys.ARROW_LEFT,
];

export function EditorWithAutocomplete({
  onEditorMount,
  onRegularKeyPress,
  onPreviewAvailable,
  setValue,
  value,
  disableAutocomplete,
}: {
  onEditorMount: (editor: Editor, showAutocomplete?: (show: boolean) => void) => void;
  onRegularKeyPress: (e: KeyboardEvent) => void;
  onPreviewAvailable: (value: string | null) => void;
  setValue: (newValue: string) => void;
  value: string;
  disableAutocomplete?: boolean;
}) {
  const {
    autocompleteIndex,
    matches,
    shouldShowAutocomplete,
    applySelectedMatch,
    moveAutocompleteCursor,
    resetAutocompleteIndex,
    setHideAutocomplete,
  } = useAutocomplete(value, onPreviewAvailable);

  const autocomplete = () => setValue(applySelectedMatch());
  const onSelection = (obj?: any) => {
    const cursorMoved = obj?.origin && ["*mouse", "+move"].includes(obj.origin);

    if (cursorMoved) {
      setHideAutocomplete(true);
    }
  };
  // for use in e2e tests
  const showAutocomplete = isTest()
    ? (show: boolean) => {
        setHideAutocomplete(!show);
        if (show) {
          resetAutocompleteIndex();
        }
      }
    : undefined;
  const onAutocompleteKeyPress = (e: KeyboardEvent) => {
    if (e.key === Keys.ENTER || e.key === Keys.TAB || e.key === Keys.ARROW_RIGHT) {
      e.preventDefault();
      autocomplete();
    } else if (e.key === Keys.ARROW_DOWN) {
      e.preventDefault();
      moveAutocompleteCursor(-1);
    } else if (e.key === Keys.ARROW_UP) {
      e.preventDefault();
      moveAutocompleteCursor(1);
    }

    if ((DISMISS_KEYS as string[]).includes(e.key)) {
      setHideAutocomplete(true);
    }
  };
  const onKeyPress = (e: KeyboardEvent) => {
    if (shouldShowAutocomplete) {
      onAutocompleteKeyPress(e);
    } else {
      onRegularKeyPress(e);
    }

    if (
      ![
        Keys.ARROW_DOWN,
        Keys.ARROW_UP,
        Keys.ESCAPE,
        Keys.ENTER,
        Keys.TAB,
        Keys.ARROW_RIGHT,
      ].includes(e.key as Keys)
    ) {
      setHideAutocomplete(false);
      resetAutocompleteIndex();
    }
  };

  if (disableAutocomplete) {
    return (
      <div className="flex items-center relative">
        <ControlledCodeMirror
          onKeyPress={onKeyPress}
          value={value}
          onSelection={onSelection}
          setValue={setValue}
          onEditorMount={(editor: Editor) => onEditorMount(editor, showAutocomplete)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center relative">
      <ControlledCodeMirror
        onKeyPress={onKeyPress}
        value={value}
        onSelection={onSelection}
        setValue={setValue}
        onEditorMount={(editor: Editor) => onEditorMount(editor, showAutocomplete)}
      />
      {shouldShowAutocomplete ? (
        <div className="absolute ml-1 opacity-50" style={{ left: `${value.length}ch` }}>
          {getRemainingCompletedTextAfterCursor(value, matches[autocompleteIndex])}
        </div>
      ) : null}
      {shouldShowAutocomplete && (
        <AutocompleteMatches
          leftOffset={getCursorIndex(value)}
          matches={matches}
          selectedIndex={autocompleteIndex}
          onMatchClick={autocomplete}
        />
      )}
    </div>
  );
}
