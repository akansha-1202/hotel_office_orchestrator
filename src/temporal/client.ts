import { Connection, Client, WorkflowHandle } from '@temporalio/client';
import { compareHotelsWorkflow } from './workflows';
import { HotelOffer } from '../types';

const temporalAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'hotel-offers';

let client: Client | null = null;

async function getClient(): Promise<Client> {
  if (client) {
    return client;
  }

  const connection = await Connection.connect({
    address: temporalAddress,
  });

  client = new Client({
    connection,
    namespace: 'default',
  });

  return client;
}

export async function runCompareHotelsWorkflow(
  city: string
): Promise<HotelOffer[]> {
  const temporal = await getClient();

  const handle: WorkflowHandle = await temporal.workflow.start(
    compareHotelsWorkflow,
    {
      taskQueue,
      // Unique id so each request gets its own run
      workflowId: `compare-hotels-${city}-${Date.now()}`,
      args: [city],
    }
  );

  console.log(`[temporal] started workflow ${handle.workflowId}`);
  const result = await handle.result();
  return result as HotelOffer[];
}
