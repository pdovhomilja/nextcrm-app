import { createTask } from "@/actions/tasks/create-task";
import { getBoards } from "@/actions/tasks/get-boards";
import { getBoardSections } from "@/actions/tasks/get-board-sections";
import db from "@/lib/db";
import { z } from "zod";
import { createMCPHandler, MCPMethodRouter } from "@/lib/ai/mcp-middleware";
import { MCPAuthContext } from "@/lib/ai/mcp-auth";

// Validation schemas for MCP tool parameters
const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  boardSectionId: z.string().min(1, "Board section ID is required"),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
});

const SearchTasksSchema = z.object({
  boardId: z.string().optional(),
  status: z.enum(['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  searchTerm: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
});

const GetTasksSchema = z.object({
  boardId: z.string().optional(),
  boardSectionId: z.string().optional(),
  status: z.enum(['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
});

// Create method router for tasks MCP server
const tasksRouter = new MCPMethodRouter();

// Register create_task method
tasksRouter.register('create_task', async (params) => {
  const validation = CreateTaskSchema.safeParse(params);
  if (!validation.success) {
    throw new Error(`Invalid parameters: ${validation.error.message}`);
  }

  const { title, description, boardSectionId } = validation.data;

  try {
    const newTask = await createTask({
      title,
      description
    }, boardSectionId);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Task created successfully',
          task: {
            id: newTask.id,
            title: newTask.title,
            description: newTask.description,
            priority: newTask.priority,
            status: newTask.status,
            position: newTask.position,
            assignedTo: newTask.assignedTo.name,
            createdBy: newTask.createdBy.name,
            createdAt: newTask.createdAt,
            updatedAt: newTask.updatedAt
          }
        }, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Register search_tasks method
tasksRouter.register('search_tasks', async (params, context: MCPAuthContext) => {
  const validation = SearchTasksSchema.safeParse(params);
  if (!validation.success) {
    throw new Error(`Invalid parameters: ${validation.error.message}`);
  }

  const { boardId, status, priority, searchTerm, limit } = validation.data;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      AND: [
        // Company filtering - user must be assignedTo or createdBy
        {
          OR: [
            { assignedTo: { memberships: { some: { companyId: context.companyId } } } },
            { createdBy: { memberships: { some: { companyId: context.companyId } } } }
          ]
        }
      ]
    };

    // Add board filter if specified
    if (boardId) {
      whereClause.AND.push({ boardSection: { boardId: boardId } });
    }
    
    // Add status filter if specified
    if (status) {
      whereClause.AND.push({ status: status });
    }
    
    // Add priority filter if specified
    if (priority) {
      whereClause.AND.push({ priority: priority });
    }
    
    // Add search term filter if specified
    if (searchTerm) {
      whereClause.AND.push({
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      });
    }

    console.log('Search tasks query:', {
      whereClause: JSON.stringify(whereClause, null, 2),
      searchTerm: searchTerm,
      companyId: context.companyId
    });

    const tasks = await db.task.findMany({
      where: whereClause,
      include: {
        assignedTo: { select: { name: true, email: true } },
        createdBy: { select: { name: true, email: true } },
        boardSection: {
          select: {
            name: true,
            board: { select: { name: true, id: true } }
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    console.log('Search results:', {
      foundTasks: tasks.length,
      taskTitles: tasks.map(t => ({ id: t.id, title: t.title }))
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Found ${tasks.length} tasks`,
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            position: task.position,
            assignedTo: {
              name: task.assignedTo.name,
              email: task.assignedTo.email
            },
            createdBy: {
              name: task.createdBy.name,
              email: task.createdBy.email
            },
            boardSection: {
              name: task.boardSection.name,
              board: task.boardSection.board
            },
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
          })),
          searchParams: validation.data
        }, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`Failed to search tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Register get_tasks method
tasksRouter.register('get_tasks', async (params, context: MCPAuthContext) => {
  console.log('get_tasks method called with context:', {
    userId: context?.userId,
    companyId: context?.companyId,
    contextExists: !!context
  });
  
  const validation = GetTasksSchema.safeParse(params);
  if (!validation.success) {
    throw new Error(`Invalid parameters: ${validation.error.message}`);
  }

  const { boardId, boardSectionId, status, limit } = validation.data;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    // Always filter by user's company through assignedTo or createdBy
    whereClause.OR = [
      { assignedTo: { memberships: { some: { companyId: context.companyId } } } },
      { createdBy: { memberships: { some: { companyId: context.companyId } } } }
    ];

    if (boardSectionId) {
      whereClause.boardSectionId = boardSectionId;
    } else if (boardId) {
      whereClause.boardSection = { boardId: boardId };
    }
    
    if (status) whereClause.status = status;

    const tasks = await db.task.findMany({
      where: whereClause,
      include: {
        assignedTo: { select: { name: true, email: true } },
        createdBy: { select: { name: true, email: true } },
        boardSection: {
          select: {
            name: true,
            board: { select: { name: true, id: true } }
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Retrieved ${tasks.length} tasks`,
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            position: task.position,
            dueDate: task.dueDate,
            assignedTo: {
              name: task.assignedTo.name,
              email: task.assignedTo.email
            },
            createdBy: {
              name: task.createdBy.name,
              email: task.createdBy.email
            },
            boardSection: {
              name: task.boardSection.name,
              board: task.boardSection.board
            },
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
          })),
          queryParams: validation.data
        }, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`Failed to retrieve tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Register get_boards method
tasksRouter.register('get_boards', async (params, context: MCPAuthContext) => {
  try {
    const boards = await getBoards(context.userId);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Retrieved ${boards.length} boards`,
          boards: boards.map(board => ({
            id: board.id,
            name: board.name,
            description: board.description,
            createdAt: board.createdAt,
            updatedAt: board.updatedAt
          }))
        }, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`Failed to retrieve boards: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Register update_task method
tasksRouter.register('update_task', async (params, context: MCPAuthContext) => {
  const UpdateTaskSchema = z.object({
    taskId: z.string().min(1, "Task ID is required"),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    dueDate: z.string().optional(), // ISO date string
  });

  const validation = UpdateTaskSchema.safeParse(params);
  if (!validation.success) {
    throw new Error(`Invalid parameters: ${validation.error.message}`);
  }

  const { taskId, title, description, status, priority, dueDate } = validation.data;

  try {
    // First verify the task exists and user has access
    const existingTask = await db.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { assignedTo: { memberships: { some: { companyId: context.companyId } } } },
          { createdBy: { memberships: { some: { companyId: context.companyId } } } }
        ]
      },
      include: {
        assignedTo: { select: { name: true, email: true } },
        createdBy: { select: { name: true, email: true } },
        boardSection: {
          select: {
            name: true,
            board: { select: { name: true, id: true } }
          }
        }
      }
    });

    if (!existingTask) {
      throw new Error(`Task with ID ${taskId} not found or access denied`);
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);

    // Update the task
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignedTo: { select: { name: true, email: true } },
        createdBy: { select: { name: true, email: true } },
        boardSection: {
          select: {
            name: true,
            board: { select: { name: true, id: true } }
          }
        }
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Task updated successfully',
          task: {
            id: updatedTask.id,
            title: updatedTask.title,
            description: updatedTask.description,
            priority: updatedTask.priority,
            status: updatedTask.status,
            position: updatedTask.position,
            dueDate: updatedTask.dueDate,
            assignedTo: {
              name: updatedTask.assignedTo.name,
              email: updatedTask.assignedTo.email
            },
            createdBy: {
              name: updatedTask.createdBy.name,
              email: updatedTask.createdBy.email
            },
            boardSection: {
              name: updatedTask.boardSection.name,
              board: updatedTask.boardSection.board
            },
            createdAt: updatedTask.createdAt,
            updatedAt: updatedTask.updatedAt
          },
          changes: updateData
        }, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Register get_board_sections method  
tasksRouter.register('get_board_sections', async (params) => {
  const { boardId } = params;
  if (!boardId) {
    throw new Error('boardId is required');
  }

  try {
    const sections = await getBoardSections(boardId);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Retrieved ${sections.length} board sections`,
          boardSections: sections.map(section => ({
            id: section.id,
            name: section.name,
            position: section.position,
            taskCount: section.tasks.length
          }))
        }, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`Failed to retrieve board sections: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Create the authenticated MCP handler
// Most operations only need read permissions, individual methods can enforce stricter permissions
const handler = createMCPHandler(tasksRouter, ['read']);

export { handler as GET, handler as POST, handler as OPTIONS };