/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { LocalizationHelper } from "devtools/shared/l10n";
const helper = new LocalizationHelper("devtools/client/locales/webconsole.properties");

/**
 * Generates a formatted timestamp string for displaying in console messages.
 *
 * @param integer [milliseconds]
 *        Optional, allows you to specify the timestamp in milliseconds since
 *        the UNIX epoch.
 * @return string
 *         The timestamp formatted for display.
 */
export const timestampString = (milliseconds: number): string => {
  const d = new Date(milliseconds);
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  const parameters = [minutes, seconds];
  return getFormatStr("timestampFormat", parameters);
};

/**
 * Retrieve a localized string.
 *
 * @param string name
 *        The string name you want from the Web Console string bundle.
 * @return string
 *         The localized string.
 */
export const getStr = (name: string): string => {
  try {
    return helper.getStr(name);
  } catch (ex) {
    console.error("Failed to get string: " + name);
    throw ex;
  }
};

/**
 * Retrieve a localized string formatted with values coming from the given
 * array.
 *
 * @param string name
 *        The string name you want from the Web Console string bundle.
 * @param array array
 *        The array of values you want in the formatted string.
 * @return string
 *         The formatted local string.
 */
export const getFormatStr = (name: string, array: number[]): string => {
  try {
    return helper.getFormatStr(name, ...array);
  } catch (ex) {
    console.error("Failed to format string: " + name);
    throw ex;
  }
};
