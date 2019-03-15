import { TimeoutFactory } from "./timeoutFactory";

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 export interface DatafileUpdate {
   datafile: string
 }

export interface DatafileUpdateListener {
  (datafileUpdate: DatafileUpdate): void
}

// TODO: Replace this with the one from js-sdk-models
interface Managed {
  start(): void

  stop(): Promise<any>
}

export interface DatafileManager extends Managed {
  get: () => string | null
  on: (eventName: string, listener: DatafileUpdateListener) => () => void
  onReady: Promise<void>
}

export enum CacheDirective {
  // Use cache entry as fallback, but wait for CDN sync before onReady
  AWAIT = 'await',
  // Use cache entry for onReady, and do CDN sync in the background
  DONT_AWAIT = 'dontawait',
}

export interface DatafileManagerConfig {
  cacheDirective?: CacheDirective
  datafile?: string
  liveUpdates?: boolean
  maxCacheAge?: number
  sdkKey: string
  timeoutFactory?: TimeoutFactory,
  updateInterval?: number
  urlTemplate?: string
}
