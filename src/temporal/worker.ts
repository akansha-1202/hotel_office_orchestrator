import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities';
import fs from 'fs';
import path from 'path';

const temporalAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'hotel-offers';

function resolveWorkflowsPath(): string {
  const jsPath = path.join(__dirname, 'workflows.js');
  const tsPath = path.join(__dirname, 'workflows.ts');

  if (fs.existsSync(jsPath)) {
    return jsPath;
  }
  if (fs.existsSync(tsPath)) {
    return tsPath;
  }

  throw new Error('Could not find workflows.js or workflows.ts');
}

async function run() {
  console.log(`[worker] connecting to Temporal at ${temporalAddress}`);

  const connection = await NativeConnection.connect({
    address: temporalAddress,
  });

  const workflowsPath = resolveWorkflowsPath();
  console.log(`[worker] using workflows at ${workflowsPath}`);

  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue,
    workflowsPath,
    activities,
  });

  console.log(`[worker] started on task queue "${taskQueue}"`);
  await worker.run();
}

run().catch((err) => {
  console.error('[worker] failed to start', err);
  process.exit(1);
});
