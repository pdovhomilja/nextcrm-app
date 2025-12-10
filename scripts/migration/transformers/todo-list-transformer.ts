/**
 * Todo List model transformer
 * Transforms MongoDB TodoList documents to PostgreSQL format
 */

export function transformTodoList(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    createdAt: mongoRecord.createdAt, // Required field (stored as string in schema)
    description: mongoRecord.description, // Required field
    title: mongoRecord.title, // Required field
    url: mongoRecord.url, // Required field
    user: mongoRecord.user, // Required field (stored as string in schema)
  };
}
