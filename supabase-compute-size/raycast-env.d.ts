/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Refresh Interval - How many days to keep cached docs data before re-fetching when the command runs. */
  "refreshIntervalDays": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `compute-size` command */
  export type ComputeSize = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `compute-size` command */
  export type ComputeSize = {}
}

