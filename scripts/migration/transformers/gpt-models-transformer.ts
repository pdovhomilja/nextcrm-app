/**
 * GPT Models model transformer
 * Transforms MongoDB gpt_models documents to PostgreSQL format
 */

import { nullableString, convertDateToISO, validateEnum } from '../utils';

const VALID_GPT_STATUS = ['ACTIVE', 'INACTIVE'] as const;

export function transformGptModels(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    model: mongoRecord.model, // Required field
    description: nullableString(mongoRecord.description),
    status: validateEnum(mongoRecord.status, VALID_GPT_STATUS),
    created_on: convertDateToISO(mongoRecord.created_on),
  };
}
