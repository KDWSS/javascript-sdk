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

import { makeGetRequest } from './nodeRequest';
import HttpPollingDatafileManager from './httpPollingDatafileManager';
import { AbortableRequest, RequestHeaders } from './http';
import { DatafileManagerConfig } from './datafileManager';

export default class NodeDatafileManager extends HttpPollingDatafileManager {
  protected makeGetRequest(reqUrl: string, headers: RequestHeaders): AbortableRequest {
    return makeGetRequest(reqUrl, headers);
  }

  protected getConfigDefaults(): Partial<DatafileManagerConfig> {
    return {
      autoUpdate: true,
    };
  }
}
