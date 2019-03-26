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
// TODO change this to use Managed from js-sdk-models when available
import { Managed } from './managed'
import { ConversionEvent, ImpressionEvent } from './events'
import { HttpClient, EventV1Request } from './httpClient'
import { EventQueue, DefaultEventQueue, SingleEventQueue } from './eventQueue'
import { getLogger } from '@optimizely/js-sdk-logging'
import { BufferedEventDispatcher, EventDispatcher } from './eventDispatcher'
import { BrowserEventDispatcher } from './eventDispatcher.browser'

const logger = getLogger('EventProcessor')

export type ProcessableEvents = ConversionEvent | ImpressionEvent

export type EventDispatchResult = { result: boolean; event: ProcessableEvents }

export type EventCallback = (result: EventDispatchResult) => void

export type EventTransformer = (
  event: ProcessableEvents,
  // TODO change this to ProjectConfig when js-sdk-models is available
  projectConfig: any,
) => Promise<void>

export type EventInterceptor = (
  event: ProcessableEvents,
  // TODO change this to ProjectConfig when js-sdk-models is available
  projectConfig: any,
) => Promise<boolean>

export interface EventProcessor extends Managed {
  // TODO change this to ProjectConfig when js-sdk-models is available
  process(event: ProcessableEvents, projectConfig: any): void
}

export abstract class AbstractEventProcessor implements EventProcessor {
  static DEFAULT_FLUSH_INTERVAL = 30000

  protected transformers: EventTransformer[]
  protected interceptors: EventInterceptor[]
  protected callbacks: EventCallback[]
  protected queue: EventQueue<ProcessableEvents>
  protected eventDispatcher: EventDispatcher

  constructor({
    httpClient,
    transformers = [],
    interceptors = [],
    callbacks = [],
    flushInterval = 30000,
    maxQueueSize = 3000,
  }: {
    httpClient: HttpClient
    transformers?: EventTransformer[]
    interceptors?: EventInterceptor[]
    callbacks?: EventCallback[]
    flushInterval?: number
    maxQueueSize?: number
  }) {
    if (process.env.BROWSER) {
      this.eventDispatcher = new BrowserEventDispatcher({ httpClient })
    } else {
      this.eventDispatcher = new BufferedEventDispatcher({ httpClient })
    }

    maxQueueSize = Math.max(1, maxQueueSize)
    if (maxQueueSize > 1) {
      this.queue = new DefaultEventQueue({
        flushInterval,
        maxQueueSize,
        sink: buffer => this.drainQueue(buffer),
      })
    } else {
      this.queue = new SingleEventQueue({
        sink: buffer => this.drainQueue(buffer),
      })
    }

    this.transformers = transformers
    this.interceptors = interceptors
    this.callbacks = callbacks
  }

  drainQueue(buffer: ProcessableEvents[]): Promise<any> {
    logger.debug('draining queue with %s events', buffer.length)

    const promises = this.groupEvents(buffer).map(eventGroup => {
      const formattedEvent = this.formatEvents(eventGroup)

      return new Promise((resolve, reject) => {
        this.eventDispatcher.dispatch(formattedEvent, result => {
          // loop through every event in the group and run the callback handler
          // with result
          eventGroup.forEach(event => {
            this.callbacks.forEach(handler => {
              handler({
                result,
                event,
              })
            })
          })

          resolve()
        })
      })
    })

    return Promise.all(promises)
  }

  // TODO change this to ProjectConfig when js-sdk-models is available
  async process(event: ProcessableEvents, projectConfig: any): Promise<void> {
    // loop and apply all transformers
    for (let transformer of this.transformers) {
      try {
        await transformer(event, projectConfig)
      } catch (ex) {
        // swallow error and move on
        logger.error('eventTransformer threw error', ex.message, ex)
      }
    }
    Object.freeze(event)

    // loop and apply all interceptors
    for (let interceptor of this.interceptors) {
      let result
      try {
        result = await interceptor(event, projectConfig)
      } catch (ex) {
        // swallow and continue
        logger.error('eventInterceptor threw error', ex.message, ex)
      }
      if (result === false) {
        return
      }
    }

    this.queue.enqueue(event)
  }

  stop(): Promise<any> {
    try {
      // swallow, an error stopping this queue should prevent this from stopping
      this.queue.stop()
      this.eventDispatcher.stop()
    } catch (e) {
      logger.error('Error stopping EventProcessor: "%s"', e.message, e)
    }
    return Promise.resolve()
  }

  start(): void {
    this.queue.start()
    this.eventDispatcher.start()
  }

  protected abstract groupEvents(events: ProcessableEvents[]): ProcessableEvents[][]

  protected abstract formatEvents(events: ProcessableEvents[]): EventV1Request
}
