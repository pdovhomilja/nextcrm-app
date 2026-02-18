/**
 * Tasks model transformer
 * Transforms MongoDB Tasks documents to PostgreSQL format
 */

import { convertDateToISO, nullableString, nullableNumber, validateEnum } from '../utils';

const VALID_TASK_STATUS = ['ACTIVE', 'PENDING', 'COMPLETE'] as const;

export function transformTasks(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  // Handle tags JSONB field
  const tags = mongoRecord.tags || null;

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    content: nullableString(mongoRecord.content),
    createdAt: convertDateToISO(mongoRecord.createdAt),
    createdBy: uuidMapper.transformForeignKey(mongoRecord.createdBy),
    updatedAt: convertDateToISO(mongoRecord.updatedAt),
    updatedBy: uuidMapper.transformForeignKey(mongoRecord.updatedBy),
    dueDateAt: convertDateToISO(mongoRecord.dueDateAt) || new Date().toISOString(),
    lastEditedAt: convertDateToISO(mongoRecord.lastEditedAt) || convertDateToISO(mongoRecord.updatedAt),
    position: mongoRecord.position || 0, // Required field
    priority: mongoRecord.priority, // Required field
    section: uuidMapper.transformForeignKey(mongoRecord.section),
    tags,
    title: mongoRecord.title, // Required field
    likes: nullableNumber(mongoRecord.likes) || 0,
    user: uuidMapper.transformForeignKey(mongoRecord.user),
    taskStatus: validateEnum(mongoRecord.taskStatus, VALID_TASK_STATUS, 'ACTIVE'),
  };
}
