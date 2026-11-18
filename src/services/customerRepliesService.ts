/**
 * BiznesYordam (BESTO) - Customer Replies AI Client Service
 */

import { CustomerReplyAiInput, CustomerRepliesAiResult } from '../types';
import { BackendAdError, BackendAiEnvelope, requestAiFromBackend } from './adBackendService';

export async function requestCustomerRepliesFromBackend(
  input: CustomerReplyAiInput & { simulatedTier?: string },
  onStatusMessage?: (status: string) => void
): Promise<{ data?: BackendAiEnvelope<CustomerRepliesAiResult>; error?: BackendAdError }> {
  return requestAiFromBackend<typeof input, BackendAiEnvelope<CustomerRepliesAiResult>>(
    '/api/ai/customer-replies',
    input,
    onStatusMessage
  );
}
