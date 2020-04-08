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

import { AbortableRequest, Response as InternalResponse, RequestHeaders as InternalRequestHeaders } from './http';
import { REQUEST_TIMEOUT_MS } from './config';
import { getLogger } from '@optimizely/js-sdk-logging';

const logger = getLogger('DatafileManager');

export function makeGetRequest(reqUrl: string, headers: InternalRequestHeaders): AbortableRequest {
  let abortController: AbortController | undefined;
  let abortSignal: AbortSignal | undefined;
  let timeout: any;
  // Checking for AbortController because we want to support CF workers, which
  // don't provide it
  if (typeof AbortController !== 'undefined') {
    abortController = new AbortController();
    abortSignal = abortController.signal;
    timeout = setTimeout(() => {
      logger.error('Request timed out');
      abortController!.abort();
    }, REQUEST_TIMEOUT_MS);
  }

  let responsePromise: Promise<InternalResponse> = fetch(reqUrl, {
    signal: abortSignal,
    headers,
  }).then((response: Response) =>
    response.text().then(
      (responseText: string): InternalResponse => ({
        statusCode: response.status,
        body: responseText,
        headers: response.headers,
      })
    )
  );

  if (timeout !== undefined) {
    responsePromise = responsePromise.then(
      (response: InternalResponse): InternalResponse => {
        clearTimeout(timeout);
        return response;
      },
      (err: any): never => {
        clearTimeout(timeout);
        throw err;
      }
    );
  }

  return {
    responsePromise,
    abort(): void {
      if (abortController) {
        abortController.abort();
      }
    },
  };
}
