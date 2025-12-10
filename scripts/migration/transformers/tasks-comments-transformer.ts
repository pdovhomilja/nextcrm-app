/**
 * Tasks Comments model transformer
 * Transforms MongoDB tasksComments documents to PostgreSQL format
 */

import { convertDateToISO } from '../utils';

export function transformTasksComments(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    comment: mongoRecord.comment, // Required field
    createdAt: convertDateToISO(mongoRecord.createdAt) || new Date().toISOString(),
    task: uuidMapper.transformForeignKey(mongoRecord.task) || '', // Required foreign key
    user: uuidMapper.transformForeignKey(mongoRecord.user) || '', // Required foreign key
    assigned_crm_account_task: uuidMapper.transformForeignKey(mongoRecord.assigned_crm_account_task),
  };
}
