//
// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {NextRequest} from 'next/server';
import {runFlow} from '@genkit-ai/next/server';
import * as path from 'path';

// Load all the flows from the flows directory.
const flows = import.meta.glob('/src/ai/flows/*.ts', {eager: true});

export async function POST(
  req: NextRequest,
  {params}: {params: {flow: string}}
) {
  const {flow} = params;

  // This is a bit of a hack to get the flow name from the path.
  // The flow files export the flow as the same name as the file.
  // e.g. /src/ai/flows/foo.ts exports a flow named `foo`.
  const flowName = path.basename(flow, '.ts');

  // Find the flow that matches the flow name, and get its definition.
  const flowDefinition = Object.values(flows).find((flow: any) => {
    return flow[flowName];
  }) as any;
  if (!flowDefinition) {
    throw new Error(`Flow not found: ${flowName}`);
  }

  // Get the input from the request body.
  const input = await req.json();

  // Run the flow.
  const {output} = await runFlow(flowDefinition[flowName], input);

  return new Response(JSON.stringify(output), {
    headers: {'Content-Type': 'application/json; charset=utf-8'},
  });
}
