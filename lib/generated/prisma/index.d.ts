
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Account
 * 
 */
export type Account = $Result.DefaultSelection<Prisma.$AccountPayload>
/**
 * Model Session
 * 
 */
export type Session = $Result.DefaultSelection<Prisma.$SessionPayload>
/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model VerificationToken
 * 
 */
export type VerificationToken = $Result.DefaultSelection<Prisma.$VerificationTokenPayload>
/**
 * Model Task
 * 
 */
export type Task = $Result.DefaultSelection<Prisma.$TaskPayload>
/**
 * Model Board
 * 
 */
export type Board = $Result.DefaultSelection<Prisma.$BoardPayload>
/**
 * Model BoardSection
 * 
 */
export type BoardSection = $Result.DefaultSelection<Prisma.$BoardSectionPayload>
/**
 * Model TaskHistory
 * 
 */
export type TaskHistory = $Result.DefaultSelection<Prisma.$TaskHistoryPayload>
/**
 * Model TaskEmbedding
 * 
 */
export type TaskEmbedding = $Result.DefaultSelection<Prisma.$TaskEmbeddingPayload>
/**
 * Model BoardEmbedding
 * 
 */
export type BoardEmbedding = $Result.DefaultSelection<Prisma.$BoardEmbeddingPayload>
/**
 * Model AIConversation
 * 
 */
export type AIConversation = $Result.DefaultSelection<Prisma.$AIConversationPayload>
/**
 * Model AIMessage
 * 
 */
export type AIMessage = $Result.DefaultSelection<Prisma.$AIMessagePayload>

/**
 * Enums
 */
export namespace $Enums {
  export const UserRole: {
  USER: 'USER',
  CONTRIBUTOR: 'CONTRIBUTOR',
  EDITOR: 'EDITOR',
  MEDIA: 'MEDIA',
  ADMIN: 'ADMIN'
};

export type UserRole = (typeof UserRole)[keyof typeof UserRole]


export const TaskPriority: {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority]


export const TaskStatusNew: {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD'
};

export type TaskStatusNew = (typeof TaskStatusNew)[keyof typeof TaskStatusNew]

}

export type UserRole = $Enums.UserRole

export const UserRole: typeof $Enums.UserRole

export type TaskPriority = $Enums.TaskPriority

export const TaskPriority: typeof $Enums.TaskPriority

export type TaskStatusNew = $Enums.TaskStatusNew

export const TaskStatusNew: typeof $Enums.TaskStatusNew

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Accounts
 * const accounts = await prisma.account.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Accounts
   * const accounts = await prisma.account.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.account`: Exposes CRUD operations for the **Account** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Accounts
    * const accounts = await prisma.account.findMany()
    * ```
    */
  get account(): Prisma.AccountDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.session`: Exposes CRUD operations for the **Session** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sessions
    * const sessions = await prisma.session.findMany()
    * ```
    */
  get session(): Prisma.SessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.verificationToken`: Exposes CRUD operations for the **VerificationToken** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more VerificationTokens
    * const verificationTokens = await prisma.verificationToken.findMany()
    * ```
    */
  get verificationToken(): Prisma.VerificationTokenDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.task`: Exposes CRUD operations for the **Task** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tasks
    * const tasks = await prisma.task.findMany()
    * ```
    */
  get task(): Prisma.TaskDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.board`: Exposes CRUD operations for the **Board** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Boards
    * const boards = await prisma.board.findMany()
    * ```
    */
  get board(): Prisma.BoardDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.boardSection`: Exposes CRUD operations for the **BoardSection** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more BoardSections
    * const boardSections = await prisma.boardSection.findMany()
    * ```
    */
  get boardSection(): Prisma.BoardSectionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.taskHistory`: Exposes CRUD operations for the **TaskHistory** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TaskHistories
    * const taskHistories = await prisma.taskHistory.findMany()
    * ```
    */
  get taskHistory(): Prisma.TaskHistoryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.taskEmbedding`: Exposes CRUD operations for the **TaskEmbedding** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TaskEmbeddings
    * const taskEmbeddings = await prisma.taskEmbedding.findMany()
    * ```
    */
  get taskEmbedding(): Prisma.TaskEmbeddingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.boardEmbedding`: Exposes CRUD operations for the **BoardEmbedding** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more BoardEmbeddings
    * const boardEmbeddings = await prisma.boardEmbedding.findMany()
    * ```
    */
  get boardEmbedding(): Prisma.BoardEmbeddingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aIConversation`: Exposes CRUD operations for the **AIConversation** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AIConversations
    * const aIConversations = await prisma.aIConversation.findMany()
    * ```
    */
  get aIConversation(): Prisma.AIConversationDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aIMessage`: Exposes CRUD operations for the **AIMessage** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AIMessages
    * const aIMessages = await prisma.aIMessage.findMany()
    * ```
    */
  get aIMessage(): Prisma.AIMessageDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.12.0
   * Query Engine version: 8047c96bbd92db98a2abc7c9323ce77c02c89dbc
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Account: 'Account',
    Session: 'Session',
    User: 'User',
    VerificationToken: 'VerificationToken',
    Task: 'Task',
    Board: 'Board',
    BoardSection: 'BoardSection',
    TaskHistory: 'TaskHistory',
    TaskEmbedding: 'TaskEmbedding',
    BoardEmbedding: 'BoardEmbedding',
    AIConversation: 'AIConversation',
    AIMessage: 'AIMessage'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "account" | "session" | "user" | "verificationToken" | "task" | "board" | "boardSection" | "taskHistory" | "taskEmbedding" | "boardEmbedding" | "aIConversation" | "aIMessage"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Account: {
        payload: Prisma.$AccountPayload<ExtArgs>
        fields: Prisma.AccountFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AccountFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AccountFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          findFirst: {
            args: Prisma.AccountFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AccountFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          findMany: {
            args: Prisma.AccountFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>[]
          }
          create: {
            args: Prisma.AccountCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          createMany: {
            args: Prisma.AccountCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AccountCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>[]
          }
          delete: {
            args: Prisma.AccountDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          update: {
            args: Prisma.AccountUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          deleteMany: {
            args: Prisma.AccountDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AccountUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AccountUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>[]
          }
          upsert: {
            args: Prisma.AccountUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          aggregate: {
            args: Prisma.AccountAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAccount>
          }
          groupBy: {
            args: Prisma.AccountGroupByArgs<ExtArgs>
            result: $Utils.Optional<AccountGroupByOutputType>[]
          }
          count: {
            args: Prisma.AccountCountArgs<ExtArgs>
            result: $Utils.Optional<AccountCountAggregateOutputType> | number
          }
        }
      }
      Session: {
        payload: Prisma.$SessionPayload<ExtArgs>
        fields: Prisma.SessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findFirst: {
            args: Prisma.SessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findMany: {
            args: Prisma.SessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          create: {
            args: Prisma.SessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          createMany: {
            args: Prisma.SessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          delete: {
            args: Prisma.SessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          update: {
            args: Prisma.SessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          deleteMany: {
            args: Prisma.SessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          upsert: {
            args: Prisma.SessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          aggregate: {
            args: Prisma.SessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSession>
          }
          groupBy: {
            args: Prisma.SessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SessionCountArgs<ExtArgs>
            result: $Utils.Optional<SessionCountAggregateOutputType> | number
          }
        }
      }
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      VerificationToken: {
        payload: Prisma.$VerificationTokenPayload<ExtArgs>
        fields: Prisma.VerificationTokenFieldRefs
        operations: {
          findUnique: {
            args: Prisma.VerificationTokenFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.VerificationTokenFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          findFirst: {
            args: Prisma.VerificationTokenFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.VerificationTokenFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          findMany: {
            args: Prisma.VerificationTokenFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>[]
          }
          create: {
            args: Prisma.VerificationTokenCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          createMany: {
            args: Prisma.VerificationTokenCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.VerificationTokenCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>[]
          }
          delete: {
            args: Prisma.VerificationTokenDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          update: {
            args: Prisma.VerificationTokenUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          deleteMany: {
            args: Prisma.VerificationTokenDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.VerificationTokenUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.VerificationTokenUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>[]
          }
          upsert: {
            args: Prisma.VerificationTokenUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationTokenPayload>
          }
          aggregate: {
            args: Prisma.VerificationTokenAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateVerificationToken>
          }
          groupBy: {
            args: Prisma.VerificationTokenGroupByArgs<ExtArgs>
            result: $Utils.Optional<VerificationTokenGroupByOutputType>[]
          }
          count: {
            args: Prisma.VerificationTokenCountArgs<ExtArgs>
            result: $Utils.Optional<VerificationTokenCountAggregateOutputType> | number
          }
        }
      }
      Task: {
        payload: Prisma.$TaskPayload<ExtArgs>
        fields: Prisma.TaskFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TaskFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TaskFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          findFirst: {
            args: Prisma.TaskFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TaskFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          findMany: {
            args: Prisma.TaskFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          create: {
            args: Prisma.TaskCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          createMany: {
            args: Prisma.TaskCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TaskCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          delete: {
            args: Prisma.TaskDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          update: {
            args: Prisma.TaskUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          deleteMany: {
            args: Prisma.TaskDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TaskUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TaskUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[]
          }
          upsert: {
            args: Prisma.TaskUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>
          }
          aggregate: {
            args: Prisma.TaskAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTask>
          }
          groupBy: {
            args: Prisma.TaskGroupByArgs<ExtArgs>
            result: $Utils.Optional<TaskGroupByOutputType>[]
          }
          count: {
            args: Prisma.TaskCountArgs<ExtArgs>
            result: $Utils.Optional<TaskCountAggregateOutputType> | number
          }
        }
      }
      Board: {
        payload: Prisma.$BoardPayload<ExtArgs>
        fields: Prisma.BoardFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BoardFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BoardFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardPayload>
          }
          findFirst: {
            args: Prisma.BoardFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BoardFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardPayload>
          }
          findMany: {
            args: Prisma.BoardFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardPayload>[]
          }
          create: {
            args: Prisma.BoardCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardPayload>
          }
          createMany: {
            args: Prisma.BoardCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BoardCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardPayload>[]
          }
          delete: {
            args: Prisma.BoardDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardPayload>
          }
          update: {
            args: Prisma.BoardUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardPayload>
          }
          deleteMany: {
            args: Prisma.BoardDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BoardUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BoardUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardPayload>[]
          }
          upsert: {
            args: Prisma.BoardUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardPayload>
          }
          aggregate: {
            args: Prisma.BoardAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBoard>
          }
          groupBy: {
            args: Prisma.BoardGroupByArgs<ExtArgs>
            result: $Utils.Optional<BoardGroupByOutputType>[]
          }
          count: {
            args: Prisma.BoardCountArgs<ExtArgs>
            result: $Utils.Optional<BoardCountAggregateOutputType> | number
          }
        }
      }
      BoardSection: {
        payload: Prisma.$BoardSectionPayload<ExtArgs>
        fields: Prisma.BoardSectionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BoardSectionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardSectionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BoardSectionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardSectionPayload>
          }
          findFirst: {
            args: Prisma.BoardSectionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardSectionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BoardSectionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardSectionPayload>
          }
          findMany: {
            args: Prisma.BoardSectionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardSectionPayload>[]
          }
          create: {
            args: Prisma.BoardSectionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardSectionPayload>
          }
          createMany: {
            args: Prisma.BoardSectionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BoardSectionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardSectionPayload>[]
          }
          delete: {
            args: Prisma.BoardSectionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardSectionPayload>
          }
          update: {
            args: Prisma.BoardSectionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardSectionPayload>
          }
          deleteMany: {
            args: Prisma.BoardSectionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BoardSectionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BoardSectionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardSectionPayload>[]
          }
          upsert: {
            args: Prisma.BoardSectionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardSectionPayload>
          }
          aggregate: {
            args: Prisma.BoardSectionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBoardSection>
          }
          groupBy: {
            args: Prisma.BoardSectionGroupByArgs<ExtArgs>
            result: $Utils.Optional<BoardSectionGroupByOutputType>[]
          }
          count: {
            args: Prisma.BoardSectionCountArgs<ExtArgs>
            result: $Utils.Optional<BoardSectionCountAggregateOutputType> | number
          }
        }
      }
      TaskHistory: {
        payload: Prisma.$TaskHistoryPayload<ExtArgs>
        fields: Prisma.TaskHistoryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TaskHistoryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskHistoryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TaskHistoryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskHistoryPayload>
          }
          findFirst: {
            args: Prisma.TaskHistoryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskHistoryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TaskHistoryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskHistoryPayload>
          }
          findMany: {
            args: Prisma.TaskHistoryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskHistoryPayload>[]
          }
          create: {
            args: Prisma.TaskHistoryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskHistoryPayload>
          }
          createMany: {
            args: Prisma.TaskHistoryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TaskHistoryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskHistoryPayload>[]
          }
          delete: {
            args: Prisma.TaskHistoryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskHistoryPayload>
          }
          update: {
            args: Prisma.TaskHistoryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskHistoryPayload>
          }
          deleteMany: {
            args: Prisma.TaskHistoryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TaskHistoryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TaskHistoryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskHistoryPayload>[]
          }
          upsert: {
            args: Prisma.TaskHistoryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskHistoryPayload>
          }
          aggregate: {
            args: Prisma.TaskHistoryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTaskHistory>
          }
          groupBy: {
            args: Prisma.TaskHistoryGroupByArgs<ExtArgs>
            result: $Utils.Optional<TaskHistoryGroupByOutputType>[]
          }
          count: {
            args: Prisma.TaskHistoryCountArgs<ExtArgs>
            result: $Utils.Optional<TaskHistoryCountAggregateOutputType> | number
          }
        }
      }
      TaskEmbedding: {
        payload: Prisma.$TaskEmbeddingPayload<ExtArgs>
        fields: Prisma.TaskEmbeddingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TaskEmbeddingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskEmbeddingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TaskEmbeddingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskEmbeddingPayload>
          }
          findFirst: {
            args: Prisma.TaskEmbeddingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskEmbeddingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TaskEmbeddingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskEmbeddingPayload>
          }
          findMany: {
            args: Prisma.TaskEmbeddingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskEmbeddingPayload>[]
          }
          delete: {
            args: Prisma.TaskEmbeddingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskEmbeddingPayload>
          }
          update: {
            args: Prisma.TaskEmbeddingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskEmbeddingPayload>
          }
          deleteMany: {
            args: Prisma.TaskEmbeddingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TaskEmbeddingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TaskEmbeddingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TaskEmbeddingPayload>[]
          }
          aggregate: {
            args: Prisma.TaskEmbeddingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTaskEmbedding>
          }
          groupBy: {
            args: Prisma.TaskEmbeddingGroupByArgs<ExtArgs>
            result: $Utils.Optional<TaskEmbeddingGroupByOutputType>[]
          }
          count: {
            args: Prisma.TaskEmbeddingCountArgs<ExtArgs>
            result: $Utils.Optional<TaskEmbeddingCountAggregateOutputType> | number
          }
        }
      }
      BoardEmbedding: {
        payload: Prisma.$BoardEmbeddingPayload<ExtArgs>
        fields: Prisma.BoardEmbeddingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BoardEmbeddingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardEmbeddingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BoardEmbeddingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardEmbeddingPayload>
          }
          findFirst: {
            args: Prisma.BoardEmbeddingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardEmbeddingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BoardEmbeddingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardEmbeddingPayload>
          }
          findMany: {
            args: Prisma.BoardEmbeddingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardEmbeddingPayload>[]
          }
          delete: {
            args: Prisma.BoardEmbeddingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardEmbeddingPayload>
          }
          update: {
            args: Prisma.BoardEmbeddingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardEmbeddingPayload>
          }
          deleteMany: {
            args: Prisma.BoardEmbeddingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BoardEmbeddingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BoardEmbeddingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BoardEmbeddingPayload>[]
          }
          aggregate: {
            args: Prisma.BoardEmbeddingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBoardEmbedding>
          }
          groupBy: {
            args: Prisma.BoardEmbeddingGroupByArgs<ExtArgs>
            result: $Utils.Optional<BoardEmbeddingGroupByOutputType>[]
          }
          count: {
            args: Prisma.BoardEmbeddingCountArgs<ExtArgs>
            result: $Utils.Optional<BoardEmbeddingCountAggregateOutputType> | number
          }
        }
      }
      AIConversation: {
        payload: Prisma.$AIConversationPayload<ExtArgs>
        fields: Prisma.AIConversationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AIConversationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIConversationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AIConversationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIConversationPayload>
          }
          findFirst: {
            args: Prisma.AIConversationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIConversationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AIConversationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIConversationPayload>
          }
          findMany: {
            args: Prisma.AIConversationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIConversationPayload>[]
          }
          create: {
            args: Prisma.AIConversationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIConversationPayload>
          }
          createMany: {
            args: Prisma.AIConversationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AIConversationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIConversationPayload>[]
          }
          delete: {
            args: Prisma.AIConversationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIConversationPayload>
          }
          update: {
            args: Prisma.AIConversationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIConversationPayload>
          }
          deleteMany: {
            args: Prisma.AIConversationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AIConversationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AIConversationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIConversationPayload>[]
          }
          upsert: {
            args: Prisma.AIConversationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIConversationPayload>
          }
          aggregate: {
            args: Prisma.AIConversationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAIConversation>
          }
          groupBy: {
            args: Prisma.AIConversationGroupByArgs<ExtArgs>
            result: $Utils.Optional<AIConversationGroupByOutputType>[]
          }
          count: {
            args: Prisma.AIConversationCountArgs<ExtArgs>
            result: $Utils.Optional<AIConversationCountAggregateOutputType> | number
          }
        }
      }
      AIMessage: {
        payload: Prisma.$AIMessagePayload<ExtArgs>
        fields: Prisma.AIMessageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AIMessageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIMessagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AIMessageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIMessagePayload>
          }
          findFirst: {
            args: Prisma.AIMessageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIMessagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AIMessageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIMessagePayload>
          }
          findMany: {
            args: Prisma.AIMessageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIMessagePayload>[]
          }
          create: {
            args: Prisma.AIMessageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIMessagePayload>
          }
          createMany: {
            args: Prisma.AIMessageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AIMessageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIMessagePayload>[]
          }
          delete: {
            args: Prisma.AIMessageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIMessagePayload>
          }
          update: {
            args: Prisma.AIMessageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIMessagePayload>
          }
          deleteMany: {
            args: Prisma.AIMessageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AIMessageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AIMessageUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIMessagePayload>[]
          }
          upsert: {
            args: Prisma.AIMessageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIMessagePayload>
          }
          aggregate: {
            args: Prisma.AIMessageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAIMessage>
          }
          groupBy: {
            args: Prisma.AIMessageGroupByArgs<ExtArgs>
            result: $Utils.Optional<AIMessageGroupByOutputType>[]
          }
          count: {
            args: Prisma.AIMessageCountArgs<ExtArgs>
            result: $Utils.Optional<AIMessageCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    account?: AccountOmit
    session?: SessionOmit
    user?: UserOmit
    verificationToken?: VerificationTokenOmit
    task?: TaskOmit
    board?: BoardOmit
    boardSection?: BoardSectionOmit
    taskHistory?: TaskHistoryOmit
    taskEmbedding?: TaskEmbeddingOmit
    boardEmbedding?: BoardEmbeddingOmit
    aIConversation?: AIConversationOmit
    aIMessage?: AIMessageOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    accounts: number
    sessions: number
    assignedTasks: number
    createdTasks: number
    aiConversations: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    accounts?: boolean | UserCountOutputTypeCountAccountsArgs
    sessions?: boolean | UserCountOutputTypeCountSessionsArgs
    assignedTasks?: boolean | UserCountOutputTypeCountAssignedTasksArgs
    createdTasks?: boolean | UserCountOutputTypeCountCreatedTasksArgs
    aiConversations?: boolean | UserCountOutputTypeCountAiConversationsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAccountsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AccountWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAssignedTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCreatedTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAiConversationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AIConversationWhereInput
  }


  /**
   * Count Type TaskCountOutputType
   */

  export type TaskCountOutputType = {
    history: number
  }

  export type TaskCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    history?: boolean | TaskCountOutputTypeCountHistoryArgs
  }

  // Custom InputTypes
  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskCountOutputType
     */
    select?: TaskCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeCountHistoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskHistoryWhereInput
  }


  /**
   * Count Type BoardCountOutputType
   */

  export type BoardCountOutputType = {
    boardSections: number
  }

  export type BoardCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    boardSections?: boolean | BoardCountOutputTypeCountBoardSectionsArgs
  }

  // Custom InputTypes
  /**
   * BoardCountOutputType without action
   */
  export type BoardCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardCountOutputType
     */
    select?: BoardCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * BoardCountOutputType without action
   */
  export type BoardCountOutputTypeCountBoardSectionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BoardSectionWhereInput
  }


  /**
   * Count Type BoardSectionCountOutputType
   */

  export type BoardSectionCountOutputType = {
    tasks: number
  }

  export type BoardSectionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    tasks?: boolean | BoardSectionCountOutputTypeCountTasksArgs
  }

  // Custom InputTypes
  /**
   * BoardSectionCountOutputType without action
   */
  export type BoardSectionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSectionCountOutputType
     */
    select?: BoardSectionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * BoardSectionCountOutputType without action
   */
  export type BoardSectionCountOutputTypeCountTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
  }


  /**
   * Count Type AIConversationCountOutputType
   */

  export type AIConversationCountOutputType = {
    messages: number
  }

  export type AIConversationCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    messages?: boolean | AIConversationCountOutputTypeCountMessagesArgs
  }

  // Custom InputTypes
  /**
   * AIConversationCountOutputType without action
   */
  export type AIConversationCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversationCountOutputType
     */
    select?: AIConversationCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AIConversationCountOutputType without action
   */
  export type AIConversationCountOutputTypeCountMessagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AIMessageWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Account
   */

  export type AggregateAccount = {
    _count: AccountCountAggregateOutputType | null
    _avg: AccountAvgAggregateOutputType | null
    _sum: AccountSumAggregateOutputType | null
    _min: AccountMinAggregateOutputType | null
    _max: AccountMaxAggregateOutputType | null
  }

  export type AccountAvgAggregateOutputType = {
    expires_at: number | null
  }

  export type AccountSumAggregateOutputType = {
    expires_at: number | null
  }

  export type AccountMinAggregateOutputType = {
    id: string | null
    userId: string | null
    type: string | null
    provider: string | null
    providerAccountId: string | null
    refresh_token: string | null
    access_token: string | null
    expires_at: number | null
    token_type: string | null
    scope: string | null
    id_token: string | null
    session_state: string | null
  }

  export type AccountMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    type: string | null
    provider: string | null
    providerAccountId: string | null
    refresh_token: string | null
    access_token: string | null
    expires_at: number | null
    token_type: string | null
    scope: string | null
    id_token: string | null
    session_state: string | null
  }

  export type AccountCountAggregateOutputType = {
    id: number
    userId: number
    type: number
    provider: number
    providerAccountId: number
    refresh_token: number
    access_token: number
    expires_at: number
    token_type: number
    scope: number
    id_token: number
    session_state: number
    _all: number
  }


  export type AccountAvgAggregateInputType = {
    expires_at?: true
  }

  export type AccountSumAggregateInputType = {
    expires_at?: true
  }

  export type AccountMinAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    provider?: true
    providerAccountId?: true
    refresh_token?: true
    access_token?: true
    expires_at?: true
    token_type?: true
    scope?: true
    id_token?: true
    session_state?: true
  }

  export type AccountMaxAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    provider?: true
    providerAccountId?: true
    refresh_token?: true
    access_token?: true
    expires_at?: true
    token_type?: true
    scope?: true
    id_token?: true
    session_state?: true
  }

  export type AccountCountAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    provider?: true
    providerAccountId?: true
    refresh_token?: true
    access_token?: true
    expires_at?: true
    token_type?: true
    scope?: true
    id_token?: true
    session_state?: true
    _all?: true
  }

  export type AccountAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Account to aggregate.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Accounts
    **/
    _count?: true | AccountCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AccountAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AccountSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AccountMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AccountMaxAggregateInputType
  }

  export type GetAccountAggregateType<T extends AccountAggregateArgs> = {
        [P in keyof T & keyof AggregateAccount]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAccount[P]>
      : GetScalarType<T[P], AggregateAccount[P]>
  }




  export type AccountGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AccountWhereInput
    orderBy?: AccountOrderByWithAggregationInput | AccountOrderByWithAggregationInput[]
    by: AccountScalarFieldEnum[] | AccountScalarFieldEnum
    having?: AccountScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AccountCountAggregateInputType | true
    _avg?: AccountAvgAggregateInputType
    _sum?: AccountSumAggregateInputType
    _min?: AccountMinAggregateInputType
    _max?: AccountMaxAggregateInputType
  }

  export type AccountGroupByOutputType = {
    id: string
    userId: string
    type: string
    provider: string
    providerAccountId: string
    refresh_token: string | null
    access_token: string | null
    expires_at: number | null
    token_type: string | null
    scope: string | null
    id_token: string | null
    session_state: string | null
    _count: AccountCountAggregateOutputType | null
    _avg: AccountAvgAggregateOutputType | null
    _sum: AccountSumAggregateOutputType | null
    _min: AccountMinAggregateOutputType | null
    _max: AccountMaxAggregateOutputType | null
  }

  type GetAccountGroupByPayload<T extends AccountGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AccountGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AccountGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AccountGroupByOutputType[P]>
            : GetScalarType<T[P], AccountGroupByOutputType[P]>
        }
      >
    >


  export type AccountSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    type?: boolean
    provider?: boolean
    providerAccountId?: boolean
    refresh_token?: boolean
    access_token?: boolean
    expires_at?: boolean
    token_type?: boolean
    scope?: boolean
    id_token?: boolean
    session_state?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["account"]>

  export type AccountSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    type?: boolean
    provider?: boolean
    providerAccountId?: boolean
    refresh_token?: boolean
    access_token?: boolean
    expires_at?: boolean
    token_type?: boolean
    scope?: boolean
    id_token?: boolean
    session_state?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["account"]>

  export type AccountSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    type?: boolean
    provider?: boolean
    providerAccountId?: boolean
    refresh_token?: boolean
    access_token?: boolean
    expires_at?: boolean
    token_type?: boolean
    scope?: boolean
    id_token?: boolean
    session_state?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["account"]>

  export type AccountSelectScalar = {
    id?: boolean
    userId?: boolean
    type?: boolean
    provider?: boolean
    providerAccountId?: boolean
    refresh_token?: boolean
    access_token?: boolean
    expires_at?: boolean
    token_type?: boolean
    scope?: boolean
    id_token?: boolean
    session_state?: boolean
  }

  export type AccountOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "type" | "provider" | "providerAccountId" | "refresh_token" | "access_token" | "expires_at" | "token_type" | "scope" | "id_token" | "session_state", ExtArgs["result"]["account"]>
  export type AccountInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AccountIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AccountIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AccountPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Account"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      type: string
      provider: string
      providerAccountId: string
      refresh_token: string | null
      access_token: string | null
      expires_at: number | null
      token_type: string | null
      scope: string | null
      id_token: string | null
      session_state: string | null
    }, ExtArgs["result"]["account"]>
    composites: {}
  }

  type AccountGetPayload<S extends boolean | null | undefined | AccountDefaultArgs> = $Result.GetResult<Prisma.$AccountPayload, S>

  type AccountCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AccountFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AccountCountAggregateInputType | true
    }

  export interface AccountDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Account'], meta: { name: 'Account' } }
    /**
     * Find zero or one Account that matches the filter.
     * @param {AccountFindUniqueArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AccountFindUniqueArgs>(args: SelectSubset<T, AccountFindUniqueArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Account that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AccountFindUniqueOrThrowArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AccountFindUniqueOrThrowArgs>(args: SelectSubset<T, AccountFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Account that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindFirstArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AccountFindFirstArgs>(args?: SelectSubset<T, AccountFindFirstArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Account that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindFirstOrThrowArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AccountFindFirstOrThrowArgs>(args?: SelectSubset<T, AccountFindFirstOrThrowArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Accounts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Accounts
     * const accounts = await prisma.account.findMany()
     * 
     * // Get first 10 Accounts
     * const accounts = await prisma.account.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const accountWithIdOnly = await prisma.account.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AccountFindManyArgs>(args?: SelectSubset<T, AccountFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Account.
     * @param {AccountCreateArgs} args - Arguments to create a Account.
     * @example
     * // Create one Account
     * const Account = await prisma.account.create({
     *   data: {
     *     // ... data to create a Account
     *   }
     * })
     * 
     */
    create<T extends AccountCreateArgs>(args: SelectSubset<T, AccountCreateArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Accounts.
     * @param {AccountCreateManyArgs} args - Arguments to create many Accounts.
     * @example
     * // Create many Accounts
     * const account = await prisma.account.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AccountCreateManyArgs>(args?: SelectSubset<T, AccountCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Accounts and returns the data saved in the database.
     * @param {AccountCreateManyAndReturnArgs} args - Arguments to create many Accounts.
     * @example
     * // Create many Accounts
     * const account = await prisma.account.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Accounts and only return the `id`
     * const accountWithIdOnly = await prisma.account.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AccountCreateManyAndReturnArgs>(args?: SelectSubset<T, AccountCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Account.
     * @param {AccountDeleteArgs} args - Arguments to delete one Account.
     * @example
     * // Delete one Account
     * const Account = await prisma.account.delete({
     *   where: {
     *     // ... filter to delete one Account
     *   }
     * })
     * 
     */
    delete<T extends AccountDeleteArgs>(args: SelectSubset<T, AccountDeleteArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Account.
     * @param {AccountUpdateArgs} args - Arguments to update one Account.
     * @example
     * // Update one Account
     * const account = await prisma.account.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AccountUpdateArgs>(args: SelectSubset<T, AccountUpdateArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Accounts.
     * @param {AccountDeleteManyArgs} args - Arguments to filter Accounts to delete.
     * @example
     * // Delete a few Accounts
     * const { count } = await prisma.account.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AccountDeleteManyArgs>(args?: SelectSubset<T, AccountDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Accounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Accounts
     * const account = await prisma.account.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AccountUpdateManyArgs>(args: SelectSubset<T, AccountUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Accounts and returns the data updated in the database.
     * @param {AccountUpdateManyAndReturnArgs} args - Arguments to update many Accounts.
     * @example
     * // Update many Accounts
     * const account = await prisma.account.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Accounts and only return the `id`
     * const accountWithIdOnly = await prisma.account.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AccountUpdateManyAndReturnArgs>(args: SelectSubset<T, AccountUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Account.
     * @param {AccountUpsertArgs} args - Arguments to update or create a Account.
     * @example
     * // Update or create a Account
     * const account = await prisma.account.upsert({
     *   create: {
     *     // ... data to create a Account
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Account we want to update
     *   }
     * })
     */
    upsert<T extends AccountUpsertArgs>(args: SelectSubset<T, AccountUpsertArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Accounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountCountArgs} args - Arguments to filter Accounts to count.
     * @example
     * // Count the number of Accounts
     * const count = await prisma.account.count({
     *   where: {
     *     // ... the filter for the Accounts we want to count
     *   }
     * })
    **/
    count<T extends AccountCountArgs>(
      args?: Subset<T, AccountCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AccountCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Account.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AccountAggregateArgs>(args: Subset<T, AccountAggregateArgs>): Prisma.PrismaPromise<GetAccountAggregateType<T>>

    /**
     * Group by Account.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AccountGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AccountGroupByArgs['orderBy'] }
        : { orderBy?: AccountGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AccountGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAccountGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Account model
   */
  readonly fields: AccountFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Account.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AccountClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Account model
   */
  interface AccountFieldRefs {
    readonly id: FieldRef<"Account", 'String'>
    readonly userId: FieldRef<"Account", 'String'>
    readonly type: FieldRef<"Account", 'String'>
    readonly provider: FieldRef<"Account", 'String'>
    readonly providerAccountId: FieldRef<"Account", 'String'>
    readonly refresh_token: FieldRef<"Account", 'String'>
    readonly access_token: FieldRef<"Account", 'String'>
    readonly expires_at: FieldRef<"Account", 'Int'>
    readonly token_type: FieldRef<"Account", 'String'>
    readonly scope: FieldRef<"Account", 'String'>
    readonly id_token: FieldRef<"Account", 'String'>
    readonly session_state: FieldRef<"Account", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Account findUnique
   */
  export type AccountFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account findUniqueOrThrow
   */
  export type AccountFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account findFirst
   */
  export type AccountFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Accounts.
     */
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account findFirstOrThrow
   */
  export type AccountFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Accounts.
     */
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account findMany
   */
  export type AccountFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Accounts to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account create
   */
  export type AccountCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The data needed to create a Account.
     */
    data: XOR<AccountCreateInput, AccountUncheckedCreateInput>
  }

  /**
   * Account createMany
   */
  export type AccountCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Accounts.
     */
    data: AccountCreateManyInput | AccountCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Account createManyAndReturn
   */
  export type AccountCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * The data used to create many Accounts.
     */
    data: AccountCreateManyInput | AccountCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Account update
   */
  export type AccountUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The data needed to update a Account.
     */
    data: XOR<AccountUpdateInput, AccountUncheckedUpdateInput>
    /**
     * Choose, which Account to update.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account updateMany
   */
  export type AccountUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Accounts.
     */
    data: XOR<AccountUpdateManyMutationInput, AccountUncheckedUpdateManyInput>
    /**
     * Filter which Accounts to update
     */
    where?: AccountWhereInput
    /**
     * Limit how many Accounts to update.
     */
    limit?: number
  }

  /**
   * Account updateManyAndReturn
   */
  export type AccountUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * The data used to update Accounts.
     */
    data: XOR<AccountUpdateManyMutationInput, AccountUncheckedUpdateManyInput>
    /**
     * Filter which Accounts to update
     */
    where?: AccountWhereInput
    /**
     * Limit how many Accounts to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Account upsert
   */
  export type AccountUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The filter to search for the Account to update in case it exists.
     */
    where: AccountWhereUniqueInput
    /**
     * In case the Account found by the `where` argument doesn't exist, create a new Account with this data.
     */
    create: XOR<AccountCreateInput, AccountUncheckedCreateInput>
    /**
     * In case the Account was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AccountUpdateInput, AccountUncheckedUpdateInput>
  }

  /**
   * Account delete
   */
  export type AccountDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter which Account to delete.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account deleteMany
   */
  export type AccountDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Accounts to delete
     */
    where?: AccountWhereInput
    /**
     * Limit how many Accounts to delete.
     */
    limit?: number
  }

  /**
   * Account without action
   */
  export type AccountDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
  }


  /**
   * Model Session
   */

  export type AggregateSession = {
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  export type SessionMinAggregateOutputType = {
    id: string | null
    sessionToken: string | null
    userId: string | null
    expires: Date | null
  }

  export type SessionMaxAggregateOutputType = {
    id: string | null
    sessionToken: string | null
    userId: string | null
    expires: Date | null
  }

  export type SessionCountAggregateOutputType = {
    id: number
    sessionToken: number
    userId: number
    expires: number
    _all: number
  }


  export type SessionMinAggregateInputType = {
    id?: true
    sessionToken?: true
    userId?: true
    expires?: true
  }

  export type SessionMaxAggregateInputType = {
    id?: true
    sessionToken?: true
    userId?: true
    expires?: true
  }

  export type SessionCountAggregateInputType = {
    id?: true
    sessionToken?: true
    userId?: true
    expires?: true
    _all?: true
  }

  export type SessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Session to aggregate.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Sessions
    **/
    _count?: true | SessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SessionMaxAggregateInputType
  }

  export type GetSessionAggregateType<T extends SessionAggregateArgs> = {
        [P in keyof T & keyof AggregateSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSession[P]>
      : GetScalarType<T[P], AggregateSession[P]>
  }




  export type SessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithAggregationInput | SessionOrderByWithAggregationInput[]
    by: SessionScalarFieldEnum[] | SessionScalarFieldEnum
    having?: SessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SessionCountAggregateInputType | true
    _min?: SessionMinAggregateInputType
    _max?: SessionMaxAggregateInputType
  }

  export type SessionGroupByOutputType = {
    id: string
    sessionToken: string
    userId: string
    expires: Date
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  type GetSessionGroupByPayload<T extends SessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SessionGroupByOutputType[P]>
            : GetScalarType<T[P], SessionGroupByOutputType[P]>
        }
      >
    >


  export type SessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sessionToken?: boolean
    userId?: boolean
    expires?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sessionToken?: boolean
    userId?: boolean
    expires?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sessionToken?: boolean
    userId?: boolean
    expires?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectScalar = {
    id?: boolean
    sessionToken?: boolean
    userId?: boolean
    expires?: boolean
  }

  export type SessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "sessionToken" | "userId" | "expires", ExtArgs["result"]["session"]>
  export type SessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type SessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type SessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $SessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Session"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      sessionToken: string
      userId: string
      expires: Date
    }, ExtArgs["result"]["session"]>
    composites: {}
  }

  type SessionGetPayload<S extends boolean | null | undefined | SessionDefaultArgs> = $Result.GetResult<Prisma.$SessionPayload, S>

  type SessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SessionCountAggregateInputType | true
    }

  export interface SessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Session'], meta: { name: 'Session' } }
    /**
     * Find zero or one Session that matches the filter.
     * @param {SessionFindUniqueArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SessionFindUniqueArgs>(args: SelectSubset<T, SessionFindUniqueArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Session that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SessionFindUniqueOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SessionFindUniqueOrThrowArgs>(args: SelectSubset<T, SessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SessionFindFirstArgs>(args?: SelectSubset<T, SessionFindFirstArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SessionFindFirstOrThrowArgs>(args?: SelectSubset<T, SessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Sessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sessions
     * const sessions = await prisma.session.findMany()
     * 
     * // Get first 10 Sessions
     * const sessions = await prisma.session.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sessionWithIdOnly = await prisma.session.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SessionFindManyArgs>(args?: SelectSubset<T, SessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Session.
     * @param {SessionCreateArgs} args - Arguments to create a Session.
     * @example
     * // Create one Session
     * const Session = await prisma.session.create({
     *   data: {
     *     // ... data to create a Session
     *   }
     * })
     * 
     */
    create<T extends SessionCreateArgs>(args: SelectSubset<T, SessionCreateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Sessions.
     * @param {SessionCreateManyArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SessionCreateManyArgs>(args?: SelectSubset<T, SessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sessions and returns the data saved in the database.
     * @param {SessionCreateManyAndReturnArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SessionCreateManyAndReturnArgs>(args?: SelectSubset<T, SessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Session.
     * @param {SessionDeleteArgs} args - Arguments to delete one Session.
     * @example
     * // Delete one Session
     * const Session = await prisma.session.delete({
     *   where: {
     *     // ... filter to delete one Session
     *   }
     * })
     * 
     */
    delete<T extends SessionDeleteArgs>(args: SelectSubset<T, SessionDeleteArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Session.
     * @param {SessionUpdateArgs} args - Arguments to update one Session.
     * @example
     * // Update one Session
     * const session = await prisma.session.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SessionUpdateArgs>(args: SelectSubset<T, SessionUpdateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Sessions.
     * @param {SessionDeleteManyArgs} args - Arguments to filter Sessions to delete.
     * @example
     * // Delete a few Sessions
     * const { count } = await prisma.session.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SessionDeleteManyArgs>(args?: SelectSubset<T, SessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SessionUpdateManyArgs>(args: SelectSubset<T, SessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions and returns the data updated in the database.
     * @param {SessionUpdateManyAndReturnArgs} args - Arguments to update many Sessions.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SessionUpdateManyAndReturnArgs>(args: SelectSubset<T, SessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Session.
     * @param {SessionUpsertArgs} args - Arguments to update or create a Session.
     * @example
     * // Update or create a Session
     * const session = await prisma.session.upsert({
     *   create: {
     *     // ... data to create a Session
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Session we want to update
     *   }
     * })
     */
    upsert<T extends SessionUpsertArgs>(args: SelectSubset<T, SessionUpsertArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionCountArgs} args - Arguments to filter Sessions to count.
     * @example
     * // Count the number of Sessions
     * const count = await prisma.session.count({
     *   where: {
     *     // ... the filter for the Sessions we want to count
     *   }
     * })
    **/
    count<T extends SessionCountArgs>(
      args?: Subset<T, SessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SessionAggregateArgs>(args: Subset<T, SessionAggregateArgs>): Prisma.PrismaPromise<GetSessionAggregateType<T>>

    /**
     * Group by Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SessionGroupByArgs['orderBy'] }
        : { orderBy?: SessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Session model
   */
  readonly fields: SessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Session.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Session model
   */
  interface SessionFieldRefs {
    readonly id: FieldRef<"Session", 'String'>
    readonly sessionToken: FieldRef<"Session", 'String'>
    readonly userId: FieldRef<"Session", 'String'>
    readonly expires: FieldRef<"Session", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Session findUnique
   */
  export type SessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findUniqueOrThrow
   */
  export type SessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findFirst
   */
  export type SessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findFirstOrThrow
   */
  export type SessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findMany
   */
  export type SessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Sessions to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session create
   */
  export type SessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to create a Session.
     */
    data: XOR<SessionCreateInput, SessionUncheckedCreateInput>
  }

  /**
   * Session createMany
   */
  export type SessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Session createManyAndReturn
   */
  export type SessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session update
   */
  export type SessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to update a Session.
     */
    data: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
    /**
     * Choose, which Session to update.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session updateMany
   */
  export type SessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
  }

  /**
   * Session updateManyAndReturn
   */
  export type SessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session upsert
   */
  export type SessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The filter to search for the Session to update in case it exists.
     */
    where: SessionWhereUniqueInput
    /**
     * In case the Session found by the `where` argument doesn't exist, create a new Session with this data.
     */
    create: XOR<SessionCreateInput, SessionUncheckedCreateInput>
    /**
     * In case the Session was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
  }

  /**
   * Session delete
   */
  export type SessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter which Session to delete.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session deleteMany
   */
  export type SessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sessions to delete
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to delete.
     */
    limit?: number
  }

  /**
   * Session without action
   */
  export type SessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
  }


  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    emailVerified: Date | null
    emailVerificationToken: string | null
    emailTokenExpires: Date | null
    image: string | null
    password: string | null
    cid: string | null
    createdAt: Date | null
    updatedAt: Date | null
    role: $Enums.UserRole | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    emailVerified: Date | null
    emailVerificationToken: string | null
    emailTokenExpires: Date | null
    image: string | null
    password: string | null
    cid: string | null
    createdAt: Date | null
    updatedAt: Date | null
    role: $Enums.UserRole | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    name: number
    email: number
    emailVerified: number
    emailVerificationToken: number
    emailTokenExpires: number
    image: number
    password: number
    cid: number
    createdAt: number
    updatedAt: number
    role: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    name?: true
    email?: true
    emailVerified?: true
    emailVerificationToken?: true
    emailTokenExpires?: true
    image?: true
    password?: true
    cid?: true
    createdAt?: true
    updatedAt?: true
    role?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    name?: true
    email?: true
    emailVerified?: true
    emailVerificationToken?: true
    emailTokenExpires?: true
    image?: true
    password?: true
    cid?: true
    createdAt?: true
    updatedAt?: true
    role?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    name?: true
    email?: true
    emailVerified?: true
    emailVerificationToken?: true
    emailTokenExpires?: true
    image?: true
    password?: true
    cid?: true
    createdAt?: true
    updatedAt?: true
    role?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    name: string | null
    email: string
    emailVerified: Date | null
    emailVerificationToken: string | null
    emailTokenExpires: Date | null
    image: string | null
    password: string | null
    cid: string | null
    createdAt: Date
    updatedAt: Date
    role: $Enums.UserRole
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    emailVerified?: boolean
    emailVerificationToken?: boolean
    emailTokenExpires?: boolean
    image?: boolean
    password?: boolean
    cid?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    role?: boolean
    accounts?: boolean | User$accountsArgs<ExtArgs>
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    assignedTasks?: boolean | User$assignedTasksArgs<ExtArgs>
    createdTasks?: boolean | User$createdTasksArgs<ExtArgs>
    aiConversations?: boolean | User$aiConversationsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    emailVerified?: boolean
    emailVerificationToken?: boolean
    emailTokenExpires?: boolean
    image?: boolean
    password?: boolean
    cid?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    role?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    emailVerified?: boolean
    emailVerificationToken?: boolean
    emailTokenExpires?: boolean
    image?: boolean
    password?: boolean
    cid?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    role?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    name?: boolean
    email?: boolean
    emailVerified?: boolean
    emailVerificationToken?: boolean
    emailTokenExpires?: boolean
    image?: boolean
    password?: boolean
    cid?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    role?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "email" | "emailVerified" | "emailVerificationToken" | "emailTokenExpires" | "image" | "password" | "cid" | "createdAt" | "updatedAt" | "role", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    accounts?: boolean | User$accountsArgs<ExtArgs>
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    assignedTasks?: boolean | User$assignedTasksArgs<ExtArgs>
    createdTasks?: boolean | User$createdTasksArgs<ExtArgs>
    aiConversations?: boolean | User$aiConversationsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      accounts: Prisma.$AccountPayload<ExtArgs>[]
      sessions: Prisma.$SessionPayload<ExtArgs>[]
      assignedTasks: Prisma.$TaskPayload<ExtArgs>[]
      createdTasks: Prisma.$TaskPayload<ExtArgs>[]
      aiConversations: Prisma.$AIConversationPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string | null
      email: string
      emailVerified: Date | null
      emailVerificationToken: string | null
      emailTokenExpires: Date | null
      image: string | null
      password: string | null
      cid: string | null
      createdAt: Date
      updatedAt: Date
      role: $Enums.UserRole
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    accounts<T extends User$accountsArgs<ExtArgs> = {}>(args?: Subset<T, User$accountsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    sessions<T extends User$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, User$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    assignedTasks<T extends User$assignedTasksArgs<ExtArgs> = {}>(args?: Subset<T, User$assignedTasksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    createdTasks<T extends User$createdTasksArgs<ExtArgs> = {}>(args?: Subset<T, User$createdTasksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    aiConversations<T extends User$aiConversationsArgs<ExtArgs> = {}>(args?: Subset<T, User$aiConversationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly emailVerified: FieldRef<"User", 'DateTime'>
    readonly emailVerificationToken: FieldRef<"User", 'String'>
    readonly emailTokenExpires: FieldRef<"User", 'DateTime'>
    readonly image: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly cid: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
    readonly role: FieldRef<"User", 'UserRole'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.accounts
   */
  export type User$accountsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    where?: AccountWhereInput
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    cursor?: AccountWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * User.sessions
   */
  export type User$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    cursor?: SessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * User.assignedTasks
   */
  export type User$assignedTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    cursor?: TaskWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * User.createdTasks
   */
  export type User$createdTasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    cursor?: TaskWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * User.aiConversations
   */
  export type User$aiConversationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationInclude<ExtArgs> | null
    where?: AIConversationWhereInput
    orderBy?: AIConversationOrderByWithRelationInput | AIConversationOrderByWithRelationInput[]
    cursor?: AIConversationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AIConversationScalarFieldEnum | AIConversationScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model VerificationToken
   */

  export type AggregateVerificationToken = {
    _count: VerificationTokenCountAggregateOutputType | null
    _min: VerificationTokenMinAggregateOutputType | null
    _max: VerificationTokenMaxAggregateOutputType | null
  }

  export type VerificationTokenMinAggregateOutputType = {
    identifier: string | null
    token: string | null
    expires: Date | null
  }

  export type VerificationTokenMaxAggregateOutputType = {
    identifier: string | null
    token: string | null
    expires: Date | null
  }

  export type VerificationTokenCountAggregateOutputType = {
    identifier: number
    token: number
    expires: number
    _all: number
  }


  export type VerificationTokenMinAggregateInputType = {
    identifier?: true
    token?: true
    expires?: true
  }

  export type VerificationTokenMaxAggregateInputType = {
    identifier?: true
    token?: true
    expires?: true
  }

  export type VerificationTokenCountAggregateInputType = {
    identifier?: true
    token?: true
    expires?: true
    _all?: true
  }

  export type VerificationTokenAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VerificationToken to aggregate.
     */
    where?: VerificationTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationTokens to fetch.
     */
    orderBy?: VerificationTokenOrderByWithRelationInput | VerificationTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: VerificationTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned VerificationTokens
    **/
    _count?: true | VerificationTokenCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: VerificationTokenMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: VerificationTokenMaxAggregateInputType
  }

  export type GetVerificationTokenAggregateType<T extends VerificationTokenAggregateArgs> = {
        [P in keyof T & keyof AggregateVerificationToken]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateVerificationToken[P]>
      : GetScalarType<T[P], AggregateVerificationToken[P]>
  }




  export type VerificationTokenGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VerificationTokenWhereInput
    orderBy?: VerificationTokenOrderByWithAggregationInput | VerificationTokenOrderByWithAggregationInput[]
    by: VerificationTokenScalarFieldEnum[] | VerificationTokenScalarFieldEnum
    having?: VerificationTokenScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: VerificationTokenCountAggregateInputType | true
    _min?: VerificationTokenMinAggregateInputType
    _max?: VerificationTokenMaxAggregateInputType
  }

  export type VerificationTokenGroupByOutputType = {
    identifier: string
    token: string
    expires: Date
    _count: VerificationTokenCountAggregateOutputType | null
    _min: VerificationTokenMinAggregateOutputType | null
    _max: VerificationTokenMaxAggregateOutputType | null
  }

  type GetVerificationTokenGroupByPayload<T extends VerificationTokenGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<VerificationTokenGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof VerificationTokenGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], VerificationTokenGroupByOutputType[P]>
            : GetScalarType<T[P], VerificationTokenGroupByOutputType[P]>
        }
      >
    >


  export type VerificationTokenSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    identifier?: boolean
    token?: boolean
    expires?: boolean
  }, ExtArgs["result"]["verificationToken"]>

  export type VerificationTokenSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    identifier?: boolean
    token?: boolean
    expires?: boolean
  }, ExtArgs["result"]["verificationToken"]>

  export type VerificationTokenSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    identifier?: boolean
    token?: boolean
    expires?: boolean
  }, ExtArgs["result"]["verificationToken"]>

  export type VerificationTokenSelectScalar = {
    identifier?: boolean
    token?: boolean
    expires?: boolean
  }

  export type VerificationTokenOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"identifier" | "token" | "expires", ExtArgs["result"]["verificationToken"]>

  export type $VerificationTokenPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "VerificationToken"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      identifier: string
      token: string
      expires: Date
    }, ExtArgs["result"]["verificationToken"]>
    composites: {}
  }

  type VerificationTokenGetPayload<S extends boolean | null | undefined | VerificationTokenDefaultArgs> = $Result.GetResult<Prisma.$VerificationTokenPayload, S>

  type VerificationTokenCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<VerificationTokenFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: VerificationTokenCountAggregateInputType | true
    }

  export interface VerificationTokenDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['VerificationToken'], meta: { name: 'VerificationToken' } }
    /**
     * Find zero or one VerificationToken that matches the filter.
     * @param {VerificationTokenFindUniqueArgs} args - Arguments to find a VerificationToken
     * @example
     * // Get one VerificationToken
     * const verificationToken = await prisma.verificationToken.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends VerificationTokenFindUniqueArgs>(args: SelectSubset<T, VerificationTokenFindUniqueArgs<ExtArgs>>): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one VerificationToken that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {VerificationTokenFindUniqueOrThrowArgs} args - Arguments to find a VerificationToken
     * @example
     * // Get one VerificationToken
     * const verificationToken = await prisma.verificationToken.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends VerificationTokenFindUniqueOrThrowArgs>(args: SelectSubset<T, VerificationTokenFindUniqueOrThrowArgs<ExtArgs>>): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first VerificationToken that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenFindFirstArgs} args - Arguments to find a VerificationToken
     * @example
     * // Get one VerificationToken
     * const verificationToken = await prisma.verificationToken.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends VerificationTokenFindFirstArgs>(args?: SelectSubset<T, VerificationTokenFindFirstArgs<ExtArgs>>): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first VerificationToken that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenFindFirstOrThrowArgs} args - Arguments to find a VerificationToken
     * @example
     * // Get one VerificationToken
     * const verificationToken = await prisma.verificationToken.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends VerificationTokenFindFirstOrThrowArgs>(args?: SelectSubset<T, VerificationTokenFindFirstOrThrowArgs<ExtArgs>>): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more VerificationTokens that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all VerificationTokens
     * const verificationTokens = await prisma.verificationToken.findMany()
     * 
     * // Get first 10 VerificationTokens
     * const verificationTokens = await prisma.verificationToken.findMany({ take: 10 })
     * 
     * // Only select the `identifier`
     * const verificationTokenWithIdentifierOnly = await prisma.verificationToken.findMany({ select: { identifier: true } })
     * 
     */
    findMany<T extends VerificationTokenFindManyArgs>(args?: SelectSubset<T, VerificationTokenFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a VerificationToken.
     * @param {VerificationTokenCreateArgs} args - Arguments to create a VerificationToken.
     * @example
     * // Create one VerificationToken
     * const VerificationToken = await prisma.verificationToken.create({
     *   data: {
     *     // ... data to create a VerificationToken
     *   }
     * })
     * 
     */
    create<T extends VerificationTokenCreateArgs>(args: SelectSubset<T, VerificationTokenCreateArgs<ExtArgs>>): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many VerificationTokens.
     * @param {VerificationTokenCreateManyArgs} args - Arguments to create many VerificationTokens.
     * @example
     * // Create many VerificationTokens
     * const verificationToken = await prisma.verificationToken.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends VerificationTokenCreateManyArgs>(args?: SelectSubset<T, VerificationTokenCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many VerificationTokens and returns the data saved in the database.
     * @param {VerificationTokenCreateManyAndReturnArgs} args - Arguments to create many VerificationTokens.
     * @example
     * // Create many VerificationTokens
     * const verificationToken = await prisma.verificationToken.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many VerificationTokens and only return the `identifier`
     * const verificationTokenWithIdentifierOnly = await prisma.verificationToken.createManyAndReturn({
     *   select: { identifier: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends VerificationTokenCreateManyAndReturnArgs>(args?: SelectSubset<T, VerificationTokenCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a VerificationToken.
     * @param {VerificationTokenDeleteArgs} args - Arguments to delete one VerificationToken.
     * @example
     * // Delete one VerificationToken
     * const VerificationToken = await prisma.verificationToken.delete({
     *   where: {
     *     // ... filter to delete one VerificationToken
     *   }
     * })
     * 
     */
    delete<T extends VerificationTokenDeleteArgs>(args: SelectSubset<T, VerificationTokenDeleteArgs<ExtArgs>>): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one VerificationToken.
     * @param {VerificationTokenUpdateArgs} args - Arguments to update one VerificationToken.
     * @example
     * // Update one VerificationToken
     * const verificationToken = await prisma.verificationToken.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends VerificationTokenUpdateArgs>(args: SelectSubset<T, VerificationTokenUpdateArgs<ExtArgs>>): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more VerificationTokens.
     * @param {VerificationTokenDeleteManyArgs} args - Arguments to filter VerificationTokens to delete.
     * @example
     * // Delete a few VerificationTokens
     * const { count } = await prisma.verificationToken.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends VerificationTokenDeleteManyArgs>(args?: SelectSubset<T, VerificationTokenDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more VerificationTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many VerificationTokens
     * const verificationToken = await prisma.verificationToken.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends VerificationTokenUpdateManyArgs>(args: SelectSubset<T, VerificationTokenUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more VerificationTokens and returns the data updated in the database.
     * @param {VerificationTokenUpdateManyAndReturnArgs} args - Arguments to update many VerificationTokens.
     * @example
     * // Update many VerificationTokens
     * const verificationToken = await prisma.verificationToken.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more VerificationTokens and only return the `identifier`
     * const verificationTokenWithIdentifierOnly = await prisma.verificationToken.updateManyAndReturn({
     *   select: { identifier: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends VerificationTokenUpdateManyAndReturnArgs>(args: SelectSubset<T, VerificationTokenUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one VerificationToken.
     * @param {VerificationTokenUpsertArgs} args - Arguments to update or create a VerificationToken.
     * @example
     * // Update or create a VerificationToken
     * const verificationToken = await prisma.verificationToken.upsert({
     *   create: {
     *     // ... data to create a VerificationToken
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the VerificationToken we want to update
     *   }
     * })
     */
    upsert<T extends VerificationTokenUpsertArgs>(args: SelectSubset<T, VerificationTokenUpsertArgs<ExtArgs>>): Prisma__VerificationTokenClient<$Result.GetResult<Prisma.$VerificationTokenPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of VerificationTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenCountArgs} args - Arguments to filter VerificationTokens to count.
     * @example
     * // Count the number of VerificationTokens
     * const count = await prisma.verificationToken.count({
     *   where: {
     *     // ... the filter for the VerificationTokens we want to count
     *   }
     * })
    **/
    count<T extends VerificationTokenCountArgs>(
      args?: Subset<T, VerificationTokenCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], VerificationTokenCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a VerificationToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends VerificationTokenAggregateArgs>(args: Subset<T, VerificationTokenAggregateArgs>): Prisma.PrismaPromise<GetVerificationTokenAggregateType<T>>

    /**
     * Group by VerificationToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationTokenGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends VerificationTokenGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: VerificationTokenGroupByArgs['orderBy'] }
        : { orderBy?: VerificationTokenGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, VerificationTokenGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetVerificationTokenGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the VerificationToken model
   */
  readonly fields: VerificationTokenFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for VerificationToken.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__VerificationTokenClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the VerificationToken model
   */
  interface VerificationTokenFieldRefs {
    readonly identifier: FieldRef<"VerificationToken", 'String'>
    readonly token: FieldRef<"VerificationToken", 'String'>
    readonly expires: FieldRef<"VerificationToken", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * VerificationToken findUnique
   */
  export type VerificationTokenFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
    /**
     * Filter, which VerificationToken to fetch.
     */
    where: VerificationTokenWhereUniqueInput
  }

  /**
   * VerificationToken findUniqueOrThrow
   */
  export type VerificationTokenFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
    /**
     * Filter, which VerificationToken to fetch.
     */
    where: VerificationTokenWhereUniqueInput
  }

  /**
   * VerificationToken findFirst
   */
  export type VerificationTokenFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
    /**
     * Filter, which VerificationToken to fetch.
     */
    where?: VerificationTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationTokens to fetch.
     */
    orderBy?: VerificationTokenOrderByWithRelationInput | VerificationTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VerificationTokens.
     */
    cursor?: VerificationTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VerificationTokens.
     */
    distinct?: VerificationTokenScalarFieldEnum | VerificationTokenScalarFieldEnum[]
  }

  /**
   * VerificationToken findFirstOrThrow
   */
  export type VerificationTokenFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
    /**
     * Filter, which VerificationToken to fetch.
     */
    where?: VerificationTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationTokens to fetch.
     */
    orderBy?: VerificationTokenOrderByWithRelationInput | VerificationTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for VerificationTokens.
     */
    cursor?: VerificationTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of VerificationTokens.
     */
    distinct?: VerificationTokenScalarFieldEnum | VerificationTokenScalarFieldEnum[]
  }

  /**
   * VerificationToken findMany
   */
  export type VerificationTokenFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
    /**
     * Filter, which VerificationTokens to fetch.
     */
    where?: VerificationTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of VerificationTokens to fetch.
     */
    orderBy?: VerificationTokenOrderByWithRelationInput | VerificationTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing VerificationTokens.
     */
    cursor?: VerificationTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` VerificationTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` VerificationTokens.
     */
    skip?: number
    distinct?: VerificationTokenScalarFieldEnum | VerificationTokenScalarFieldEnum[]
  }

  /**
   * VerificationToken create
   */
  export type VerificationTokenCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
    /**
     * The data needed to create a VerificationToken.
     */
    data: XOR<VerificationTokenCreateInput, VerificationTokenUncheckedCreateInput>
  }

  /**
   * VerificationToken createMany
   */
  export type VerificationTokenCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many VerificationTokens.
     */
    data: VerificationTokenCreateManyInput | VerificationTokenCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * VerificationToken createManyAndReturn
   */
  export type VerificationTokenCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
    /**
     * The data used to create many VerificationTokens.
     */
    data: VerificationTokenCreateManyInput | VerificationTokenCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * VerificationToken update
   */
  export type VerificationTokenUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
    /**
     * The data needed to update a VerificationToken.
     */
    data: XOR<VerificationTokenUpdateInput, VerificationTokenUncheckedUpdateInput>
    /**
     * Choose, which VerificationToken to update.
     */
    where: VerificationTokenWhereUniqueInput
  }

  /**
   * VerificationToken updateMany
   */
  export type VerificationTokenUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update VerificationTokens.
     */
    data: XOR<VerificationTokenUpdateManyMutationInput, VerificationTokenUncheckedUpdateManyInput>
    /**
     * Filter which VerificationTokens to update
     */
    where?: VerificationTokenWhereInput
    /**
     * Limit how many VerificationTokens to update.
     */
    limit?: number
  }

  /**
   * VerificationToken updateManyAndReturn
   */
  export type VerificationTokenUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
    /**
     * The data used to update VerificationTokens.
     */
    data: XOR<VerificationTokenUpdateManyMutationInput, VerificationTokenUncheckedUpdateManyInput>
    /**
     * Filter which VerificationTokens to update
     */
    where?: VerificationTokenWhereInput
    /**
     * Limit how many VerificationTokens to update.
     */
    limit?: number
  }

  /**
   * VerificationToken upsert
   */
  export type VerificationTokenUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
    /**
     * The filter to search for the VerificationToken to update in case it exists.
     */
    where: VerificationTokenWhereUniqueInput
    /**
     * In case the VerificationToken found by the `where` argument doesn't exist, create a new VerificationToken with this data.
     */
    create: XOR<VerificationTokenCreateInput, VerificationTokenUncheckedCreateInput>
    /**
     * In case the VerificationToken was found with the provided `where` argument, update it with this data.
     */
    update: XOR<VerificationTokenUpdateInput, VerificationTokenUncheckedUpdateInput>
  }

  /**
   * VerificationToken delete
   */
  export type VerificationTokenDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
    /**
     * Filter which VerificationToken to delete.
     */
    where: VerificationTokenWhereUniqueInput
  }

  /**
   * VerificationToken deleteMany
   */
  export type VerificationTokenDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which VerificationTokens to delete
     */
    where?: VerificationTokenWhereInput
    /**
     * Limit how many VerificationTokens to delete.
     */
    limit?: number
  }

  /**
   * VerificationToken without action
   */
  export type VerificationTokenDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VerificationToken
     */
    select?: VerificationTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the VerificationToken
     */
    omit?: VerificationTokenOmit<ExtArgs> | null
  }


  /**
   * Model Task
   */

  export type AggregateTask = {
    _count: TaskCountAggregateOutputType | null
    _avg: TaskAvgAggregateOutputType | null
    _sum: TaskSumAggregateOutputType | null
    _min: TaskMinAggregateOutputType | null
    _max: TaskMaxAggregateOutputType | null
  }

  export type TaskAvgAggregateOutputType = {
    position: number | null
  }

  export type TaskSumAggregateOutputType = {
    position: number | null
  }

  export type TaskMinAggregateOutputType = {
    id: string | null
    title: string | null
    description: string | null
    priority: $Enums.TaskPriority | null
    status: $Enums.TaskStatusNew | null
    dueDate: Date | null
    position: number | null
    assignedToId: string | null
    createdById: string | null
    boardSectionId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskMaxAggregateOutputType = {
    id: string | null
    title: string | null
    description: string | null
    priority: $Enums.TaskPriority | null
    status: $Enums.TaskStatusNew | null
    dueDate: Date | null
    position: number | null
    assignedToId: string | null
    createdById: string | null
    boardSectionId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskCountAggregateOutputType = {
    id: number
    title: number
    description: number
    priority: number
    status: number
    dueDate: number
    position: number
    assignedToId: number
    createdById: number
    boardSectionId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TaskAvgAggregateInputType = {
    position?: true
  }

  export type TaskSumAggregateInputType = {
    position?: true
  }

  export type TaskMinAggregateInputType = {
    id?: true
    title?: true
    description?: true
    priority?: true
    status?: true
    dueDate?: true
    position?: true
    assignedToId?: true
    createdById?: true
    boardSectionId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskMaxAggregateInputType = {
    id?: true
    title?: true
    description?: true
    priority?: true
    status?: true
    dueDate?: true
    position?: true
    assignedToId?: true
    createdById?: true
    boardSectionId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskCountAggregateInputType = {
    id?: true
    title?: true
    description?: true
    priority?: true
    status?: true
    dueDate?: true
    position?: true
    assignedToId?: true
    createdById?: true
    boardSectionId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TaskAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Task to aggregate.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Tasks
    **/
    _count?: true | TaskCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TaskAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TaskSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TaskMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TaskMaxAggregateInputType
  }

  export type GetTaskAggregateType<T extends TaskAggregateArgs> = {
        [P in keyof T & keyof AggregateTask]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTask[P]>
      : GetScalarType<T[P], AggregateTask[P]>
  }




  export type TaskGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithAggregationInput | TaskOrderByWithAggregationInput[]
    by: TaskScalarFieldEnum[] | TaskScalarFieldEnum
    having?: TaskScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TaskCountAggregateInputType | true
    _avg?: TaskAvgAggregateInputType
    _sum?: TaskSumAggregateInputType
    _min?: TaskMinAggregateInputType
    _max?: TaskMaxAggregateInputType
  }

  export type TaskGroupByOutputType = {
    id: string
    title: string
    description: string
    priority: $Enums.TaskPriority
    status: $Enums.TaskStatusNew
    dueDate: Date
    position: number
    assignedToId: string
    createdById: string
    boardSectionId: string
    createdAt: Date
    updatedAt: Date
    _count: TaskCountAggregateOutputType | null
    _avg: TaskAvgAggregateOutputType | null
    _sum: TaskSumAggregateOutputType | null
    _min: TaskMinAggregateOutputType | null
    _max: TaskMaxAggregateOutputType | null
  }

  type GetTaskGroupByPayload<T extends TaskGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TaskGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TaskGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TaskGroupByOutputType[P]>
            : GetScalarType<T[P], TaskGroupByOutputType[P]>
        }
      >
    >


  export type TaskSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    description?: boolean
    priority?: boolean
    status?: boolean
    dueDate?: boolean
    position?: boolean
    assignedToId?: boolean
    createdById?: boolean
    boardSectionId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    assignedTo?: boolean | UserDefaultArgs<ExtArgs>
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    boardSection?: boolean | BoardSectionDefaultArgs<ExtArgs>
    history?: boolean | Task$historyArgs<ExtArgs>
    embedding?: boolean | Task$embeddingArgs<ExtArgs>
    _count?: boolean | TaskCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["task"]>

  export type TaskSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    description?: boolean
    priority?: boolean
    status?: boolean
    dueDate?: boolean
    position?: boolean
    assignedToId?: boolean
    createdById?: boolean
    boardSectionId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    assignedTo?: boolean | UserDefaultArgs<ExtArgs>
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    boardSection?: boolean | BoardSectionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["task"]>

  export type TaskSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    description?: boolean
    priority?: boolean
    status?: boolean
    dueDate?: boolean
    position?: boolean
    assignedToId?: boolean
    createdById?: boolean
    boardSectionId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    assignedTo?: boolean | UserDefaultArgs<ExtArgs>
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    boardSection?: boolean | BoardSectionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["task"]>

  export type TaskSelectScalar = {
    id?: boolean
    title?: boolean
    description?: boolean
    priority?: boolean
    status?: boolean
    dueDate?: boolean
    position?: boolean
    assignedToId?: boolean
    createdById?: boolean
    boardSectionId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TaskOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "title" | "description" | "priority" | "status" | "dueDate" | "position" | "assignedToId" | "createdById" | "boardSectionId" | "createdAt" | "updatedAt", ExtArgs["result"]["task"]>
  export type TaskInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    assignedTo?: boolean | UserDefaultArgs<ExtArgs>
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    boardSection?: boolean | BoardSectionDefaultArgs<ExtArgs>
    history?: boolean | Task$historyArgs<ExtArgs>
    embedding?: boolean | Task$embeddingArgs<ExtArgs>
    _count?: boolean | TaskCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TaskIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    assignedTo?: boolean | UserDefaultArgs<ExtArgs>
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    boardSection?: boolean | BoardSectionDefaultArgs<ExtArgs>
  }
  export type TaskIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    assignedTo?: boolean | UserDefaultArgs<ExtArgs>
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    boardSection?: boolean | BoardSectionDefaultArgs<ExtArgs>
  }

  export type $TaskPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Task"
    objects: {
      assignedTo: Prisma.$UserPayload<ExtArgs>
      createdBy: Prisma.$UserPayload<ExtArgs>
      boardSection: Prisma.$BoardSectionPayload<ExtArgs>
      history: Prisma.$TaskHistoryPayload<ExtArgs>[]
      embedding: Prisma.$TaskEmbeddingPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      title: string
      description: string
      priority: $Enums.TaskPriority
      status: $Enums.TaskStatusNew
      dueDate: Date
      position: number
      assignedToId: string
      createdById: string
      boardSectionId: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["task"]>
    composites: {}
  }

  type TaskGetPayload<S extends boolean | null | undefined | TaskDefaultArgs> = $Result.GetResult<Prisma.$TaskPayload, S>

  type TaskCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TaskFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TaskCountAggregateInputType | true
    }

  export interface TaskDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Task'], meta: { name: 'Task' } }
    /**
     * Find zero or one Task that matches the filter.
     * @param {TaskFindUniqueArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TaskFindUniqueArgs>(args: SelectSubset<T, TaskFindUniqueArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Task that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TaskFindUniqueOrThrowArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TaskFindUniqueOrThrowArgs>(args: SelectSubset<T, TaskFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Task that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindFirstArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TaskFindFirstArgs>(args?: SelectSubset<T, TaskFindFirstArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Task that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindFirstOrThrowArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TaskFindFirstOrThrowArgs>(args?: SelectSubset<T, TaskFindFirstOrThrowArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Tasks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tasks
     * const tasks = await prisma.task.findMany()
     * 
     * // Get first 10 Tasks
     * const tasks = await prisma.task.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const taskWithIdOnly = await prisma.task.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TaskFindManyArgs>(args?: SelectSubset<T, TaskFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Task.
     * @param {TaskCreateArgs} args - Arguments to create a Task.
     * @example
     * // Create one Task
     * const Task = await prisma.task.create({
     *   data: {
     *     // ... data to create a Task
     *   }
     * })
     * 
     */
    create<T extends TaskCreateArgs>(args: SelectSubset<T, TaskCreateArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Tasks.
     * @param {TaskCreateManyArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const task = await prisma.task.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TaskCreateManyArgs>(args?: SelectSubset<T, TaskCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Tasks and returns the data saved in the database.
     * @param {TaskCreateManyAndReturnArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const task = await prisma.task.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Tasks and only return the `id`
     * const taskWithIdOnly = await prisma.task.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TaskCreateManyAndReturnArgs>(args?: SelectSubset<T, TaskCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Task.
     * @param {TaskDeleteArgs} args - Arguments to delete one Task.
     * @example
     * // Delete one Task
     * const Task = await prisma.task.delete({
     *   where: {
     *     // ... filter to delete one Task
     *   }
     * })
     * 
     */
    delete<T extends TaskDeleteArgs>(args: SelectSubset<T, TaskDeleteArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Task.
     * @param {TaskUpdateArgs} args - Arguments to update one Task.
     * @example
     * // Update one Task
     * const task = await prisma.task.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TaskUpdateArgs>(args: SelectSubset<T, TaskUpdateArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Tasks.
     * @param {TaskDeleteManyArgs} args - Arguments to filter Tasks to delete.
     * @example
     * // Delete a few Tasks
     * const { count } = await prisma.task.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TaskDeleteManyArgs>(args?: SelectSubset<T, TaskDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tasks
     * const task = await prisma.task.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TaskUpdateManyArgs>(args: SelectSubset<T, TaskUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tasks and returns the data updated in the database.
     * @param {TaskUpdateManyAndReturnArgs} args - Arguments to update many Tasks.
     * @example
     * // Update many Tasks
     * const task = await prisma.task.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Tasks and only return the `id`
     * const taskWithIdOnly = await prisma.task.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TaskUpdateManyAndReturnArgs>(args: SelectSubset<T, TaskUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Task.
     * @param {TaskUpsertArgs} args - Arguments to update or create a Task.
     * @example
     * // Update or create a Task
     * const task = await prisma.task.upsert({
     *   create: {
     *     // ... data to create a Task
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Task we want to update
     *   }
     * })
     */
    upsert<T extends TaskUpsertArgs>(args: SelectSubset<T, TaskUpsertArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCountArgs} args - Arguments to filter Tasks to count.
     * @example
     * // Count the number of Tasks
     * const count = await prisma.task.count({
     *   where: {
     *     // ... the filter for the Tasks we want to count
     *   }
     * })
    **/
    count<T extends TaskCountArgs>(
      args?: Subset<T, TaskCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TaskCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Task.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TaskAggregateArgs>(args: Subset<T, TaskAggregateArgs>): Prisma.PrismaPromise<GetTaskAggregateType<T>>

    /**
     * Group by Task.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TaskGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TaskGroupByArgs['orderBy'] }
        : { orderBy?: TaskGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TaskGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTaskGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Task model
   */
  readonly fields: TaskFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Task.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TaskClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    assignedTo<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    createdBy<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    boardSection<T extends BoardSectionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, BoardSectionDefaultArgs<ExtArgs>>): Prisma__BoardSectionClient<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    history<T extends Task$historyArgs<ExtArgs> = {}>(args?: Subset<T, Task$historyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    embedding<T extends Task$embeddingArgs<ExtArgs> = {}>(args?: Subset<T, Task$embeddingArgs<ExtArgs>>): Prisma__TaskEmbeddingClient<$Result.GetResult<Prisma.$TaskEmbeddingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Task model
   */
  interface TaskFieldRefs {
    readonly id: FieldRef<"Task", 'String'>
    readonly title: FieldRef<"Task", 'String'>
    readonly description: FieldRef<"Task", 'String'>
    readonly priority: FieldRef<"Task", 'TaskPriority'>
    readonly status: FieldRef<"Task", 'TaskStatusNew'>
    readonly dueDate: FieldRef<"Task", 'DateTime'>
    readonly position: FieldRef<"Task", 'Int'>
    readonly assignedToId: FieldRef<"Task", 'String'>
    readonly createdById: FieldRef<"Task", 'String'>
    readonly boardSectionId: FieldRef<"Task", 'String'>
    readonly createdAt: FieldRef<"Task", 'DateTime'>
    readonly updatedAt: FieldRef<"Task", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Task findUnique
   */
  export type TaskFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task findUniqueOrThrow
   */
  export type TaskFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task findFirst
   */
  export type TaskFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tasks.
     */
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task findFirstOrThrow
   */
  export type TaskFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Task to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tasks.
     */
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task findMany
   */
  export type TaskFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter, which Tasks to fetch.
     */
    where?: TaskWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Tasks.
     */
    cursor?: TaskWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tasks.
     */
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * Task create
   */
  export type TaskCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The data needed to create a Task.
     */
    data: XOR<TaskCreateInput, TaskUncheckedCreateInput>
  }

  /**
   * Task createMany
   */
  export type TaskCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Tasks.
     */
    data: TaskCreateManyInput | TaskCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Task createManyAndReturn
   */
  export type TaskCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * The data used to create many Tasks.
     */
    data: TaskCreateManyInput | TaskCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Task update
   */
  export type TaskUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The data needed to update a Task.
     */
    data: XOR<TaskUpdateInput, TaskUncheckedUpdateInput>
    /**
     * Choose, which Task to update.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task updateMany
   */
  export type TaskUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Tasks.
     */
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyInput>
    /**
     * Filter which Tasks to update
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to update.
     */
    limit?: number
  }

  /**
   * Task updateManyAndReturn
   */
  export type TaskUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * The data used to update Tasks.
     */
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyInput>
    /**
     * Filter which Tasks to update
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Task upsert
   */
  export type TaskUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * The filter to search for the Task to update in case it exists.
     */
    where: TaskWhereUniqueInput
    /**
     * In case the Task found by the `where` argument doesn't exist, create a new Task with this data.
     */
    create: XOR<TaskCreateInput, TaskUncheckedCreateInput>
    /**
     * In case the Task was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TaskUpdateInput, TaskUncheckedUpdateInput>
  }

  /**
   * Task delete
   */
  export type TaskDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    /**
     * Filter which Task to delete.
     */
    where: TaskWhereUniqueInput
  }

  /**
   * Task deleteMany
   */
  export type TaskDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tasks to delete
     */
    where?: TaskWhereInput
    /**
     * Limit how many Tasks to delete.
     */
    limit?: number
  }

  /**
   * Task.history
   */
  export type Task$historyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryInclude<ExtArgs> | null
    where?: TaskHistoryWhereInput
    orderBy?: TaskHistoryOrderByWithRelationInput | TaskHistoryOrderByWithRelationInput[]
    cursor?: TaskHistoryWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskHistoryScalarFieldEnum | TaskHistoryScalarFieldEnum[]
  }

  /**
   * Task.embedding
   */
  export type Task$embeddingArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskEmbedding
     */
    select?: TaskEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskEmbedding
     */
    omit?: TaskEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskEmbeddingInclude<ExtArgs> | null
    where?: TaskEmbeddingWhereInput
  }

  /**
   * Task without action
   */
  export type TaskDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
  }


  /**
   * Model Board
   */

  export type AggregateBoard = {
    _count: BoardCountAggregateOutputType | null
    _min: BoardMinAggregateOutputType | null
    _max: BoardMaxAggregateOutputType | null
  }

  export type BoardMinAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    createdBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BoardMaxAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    createdBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BoardCountAggregateOutputType = {
    id: number
    name: number
    description: number
    createdBy: number
    createdAt: number
    updatedAt: number
    access: number
    _all: number
  }


  export type BoardMinAggregateInputType = {
    id?: true
    name?: true
    description?: true
    createdBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BoardMaxAggregateInputType = {
    id?: true
    name?: true
    description?: true
    createdBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BoardCountAggregateInputType = {
    id?: true
    name?: true
    description?: true
    createdBy?: true
    createdAt?: true
    updatedAt?: true
    access?: true
    _all?: true
  }

  export type BoardAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Board to aggregate.
     */
    where?: BoardWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Boards to fetch.
     */
    orderBy?: BoardOrderByWithRelationInput | BoardOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BoardWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Boards from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Boards.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Boards
    **/
    _count?: true | BoardCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BoardMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BoardMaxAggregateInputType
  }

  export type GetBoardAggregateType<T extends BoardAggregateArgs> = {
        [P in keyof T & keyof AggregateBoard]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBoard[P]>
      : GetScalarType<T[P], AggregateBoard[P]>
  }




  export type BoardGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BoardWhereInput
    orderBy?: BoardOrderByWithAggregationInput | BoardOrderByWithAggregationInput[]
    by: BoardScalarFieldEnum[] | BoardScalarFieldEnum
    having?: BoardScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BoardCountAggregateInputType | true
    _min?: BoardMinAggregateInputType
    _max?: BoardMaxAggregateInputType
  }

  export type BoardGroupByOutputType = {
    id: string
    name: string
    description: string | null
    createdBy: string
    createdAt: Date
    updatedAt: Date
    access: string[]
    _count: BoardCountAggregateOutputType | null
    _min: BoardMinAggregateOutputType | null
    _max: BoardMaxAggregateOutputType | null
  }

  type GetBoardGroupByPayload<T extends BoardGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BoardGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BoardGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BoardGroupByOutputType[P]>
            : GetScalarType<T[P], BoardGroupByOutputType[P]>
        }
      >
    >


  export type BoardSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    createdBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    access?: boolean
    boardSections?: boolean | Board$boardSectionsArgs<ExtArgs>
    embedding?: boolean | Board$embeddingArgs<ExtArgs>
    _count?: boolean | BoardCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["board"]>

  export type BoardSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    createdBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    access?: boolean
  }, ExtArgs["result"]["board"]>

  export type BoardSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    createdBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    access?: boolean
  }, ExtArgs["result"]["board"]>

  export type BoardSelectScalar = {
    id?: boolean
    name?: boolean
    description?: boolean
    createdBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    access?: boolean
  }

  export type BoardOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "description" | "createdBy" | "createdAt" | "updatedAt" | "access", ExtArgs["result"]["board"]>
  export type BoardInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    boardSections?: boolean | Board$boardSectionsArgs<ExtArgs>
    embedding?: boolean | Board$embeddingArgs<ExtArgs>
    _count?: boolean | BoardCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type BoardIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type BoardIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $BoardPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Board"
    objects: {
      boardSections: Prisma.$BoardSectionPayload<ExtArgs>[]
      embedding: Prisma.$BoardEmbeddingPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      description: string | null
      createdBy: string
      createdAt: Date
      updatedAt: Date
      access: string[]
    }, ExtArgs["result"]["board"]>
    composites: {}
  }

  type BoardGetPayload<S extends boolean | null | undefined | BoardDefaultArgs> = $Result.GetResult<Prisma.$BoardPayload, S>

  type BoardCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BoardFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BoardCountAggregateInputType | true
    }

  export interface BoardDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Board'], meta: { name: 'Board' } }
    /**
     * Find zero or one Board that matches the filter.
     * @param {BoardFindUniqueArgs} args - Arguments to find a Board
     * @example
     * // Get one Board
     * const board = await prisma.board.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BoardFindUniqueArgs>(args: SelectSubset<T, BoardFindUniqueArgs<ExtArgs>>): Prisma__BoardClient<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Board that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BoardFindUniqueOrThrowArgs} args - Arguments to find a Board
     * @example
     * // Get one Board
     * const board = await prisma.board.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BoardFindUniqueOrThrowArgs>(args: SelectSubset<T, BoardFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BoardClient<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Board that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardFindFirstArgs} args - Arguments to find a Board
     * @example
     * // Get one Board
     * const board = await prisma.board.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BoardFindFirstArgs>(args?: SelectSubset<T, BoardFindFirstArgs<ExtArgs>>): Prisma__BoardClient<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Board that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardFindFirstOrThrowArgs} args - Arguments to find a Board
     * @example
     * // Get one Board
     * const board = await prisma.board.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BoardFindFirstOrThrowArgs>(args?: SelectSubset<T, BoardFindFirstOrThrowArgs<ExtArgs>>): Prisma__BoardClient<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Boards that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Boards
     * const boards = await prisma.board.findMany()
     * 
     * // Get first 10 Boards
     * const boards = await prisma.board.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const boardWithIdOnly = await prisma.board.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BoardFindManyArgs>(args?: SelectSubset<T, BoardFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Board.
     * @param {BoardCreateArgs} args - Arguments to create a Board.
     * @example
     * // Create one Board
     * const Board = await prisma.board.create({
     *   data: {
     *     // ... data to create a Board
     *   }
     * })
     * 
     */
    create<T extends BoardCreateArgs>(args: SelectSubset<T, BoardCreateArgs<ExtArgs>>): Prisma__BoardClient<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Boards.
     * @param {BoardCreateManyArgs} args - Arguments to create many Boards.
     * @example
     * // Create many Boards
     * const board = await prisma.board.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BoardCreateManyArgs>(args?: SelectSubset<T, BoardCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Boards and returns the data saved in the database.
     * @param {BoardCreateManyAndReturnArgs} args - Arguments to create many Boards.
     * @example
     * // Create many Boards
     * const board = await prisma.board.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Boards and only return the `id`
     * const boardWithIdOnly = await prisma.board.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BoardCreateManyAndReturnArgs>(args?: SelectSubset<T, BoardCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Board.
     * @param {BoardDeleteArgs} args - Arguments to delete one Board.
     * @example
     * // Delete one Board
     * const Board = await prisma.board.delete({
     *   where: {
     *     // ... filter to delete one Board
     *   }
     * })
     * 
     */
    delete<T extends BoardDeleteArgs>(args: SelectSubset<T, BoardDeleteArgs<ExtArgs>>): Prisma__BoardClient<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Board.
     * @param {BoardUpdateArgs} args - Arguments to update one Board.
     * @example
     * // Update one Board
     * const board = await prisma.board.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BoardUpdateArgs>(args: SelectSubset<T, BoardUpdateArgs<ExtArgs>>): Prisma__BoardClient<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Boards.
     * @param {BoardDeleteManyArgs} args - Arguments to filter Boards to delete.
     * @example
     * // Delete a few Boards
     * const { count } = await prisma.board.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BoardDeleteManyArgs>(args?: SelectSubset<T, BoardDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Boards.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Boards
     * const board = await prisma.board.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BoardUpdateManyArgs>(args: SelectSubset<T, BoardUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Boards and returns the data updated in the database.
     * @param {BoardUpdateManyAndReturnArgs} args - Arguments to update many Boards.
     * @example
     * // Update many Boards
     * const board = await prisma.board.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Boards and only return the `id`
     * const boardWithIdOnly = await prisma.board.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BoardUpdateManyAndReturnArgs>(args: SelectSubset<T, BoardUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Board.
     * @param {BoardUpsertArgs} args - Arguments to update or create a Board.
     * @example
     * // Update or create a Board
     * const board = await prisma.board.upsert({
     *   create: {
     *     // ... data to create a Board
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Board we want to update
     *   }
     * })
     */
    upsert<T extends BoardUpsertArgs>(args: SelectSubset<T, BoardUpsertArgs<ExtArgs>>): Prisma__BoardClient<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Boards.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardCountArgs} args - Arguments to filter Boards to count.
     * @example
     * // Count the number of Boards
     * const count = await prisma.board.count({
     *   where: {
     *     // ... the filter for the Boards we want to count
     *   }
     * })
    **/
    count<T extends BoardCountArgs>(
      args?: Subset<T, BoardCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BoardCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Board.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BoardAggregateArgs>(args: Subset<T, BoardAggregateArgs>): Prisma.PrismaPromise<GetBoardAggregateType<T>>

    /**
     * Group by Board.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BoardGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BoardGroupByArgs['orderBy'] }
        : { orderBy?: BoardGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BoardGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBoardGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Board model
   */
  readonly fields: BoardFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Board.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BoardClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    boardSections<T extends Board$boardSectionsArgs<ExtArgs> = {}>(args?: Subset<T, Board$boardSectionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    embedding<T extends Board$embeddingArgs<ExtArgs> = {}>(args?: Subset<T, Board$embeddingArgs<ExtArgs>>): Prisma__BoardEmbeddingClient<$Result.GetResult<Prisma.$BoardEmbeddingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Board model
   */
  interface BoardFieldRefs {
    readonly id: FieldRef<"Board", 'String'>
    readonly name: FieldRef<"Board", 'String'>
    readonly description: FieldRef<"Board", 'String'>
    readonly createdBy: FieldRef<"Board", 'String'>
    readonly createdAt: FieldRef<"Board", 'DateTime'>
    readonly updatedAt: FieldRef<"Board", 'DateTime'>
    readonly access: FieldRef<"Board", 'String[]'>
  }
    

  // Custom InputTypes
  /**
   * Board findUnique
   */
  export type BoardFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardInclude<ExtArgs> | null
    /**
     * Filter, which Board to fetch.
     */
    where: BoardWhereUniqueInput
  }

  /**
   * Board findUniqueOrThrow
   */
  export type BoardFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardInclude<ExtArgs> | null
    /**
     * Filter, which Board to fetch.
     */
    where: BoardWhereUniqueInput
  }

  /**
   * Board findFirst
   */
  export type BoardFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardInclude<ExtArgs> | null
    /**
     * Filter, which Board to fetch.
     */
    where?: BoardWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Boards to fetch.
     */
    orderBy?: BoardOrderByWithRelationInput | BoardOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Boards.
     */
    cursor?: BoardWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Boards from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Boards.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Boards.
     */
    distinct?: BoardScalarFieldEnum | BoardScalarFieldEnum[]
  }

  /**
   * Board findFirstOrThrow
   */
  export type BoardFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardInclude<ExtArgs> | null
    /**
     * Filter, which Board to fetch.
     */
    where?: BoardWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Boards to fetch.
     */
    orderBy?: BoardOrderByWithRelationInput | BoardOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Boards.
     */
    cursor?: BoardWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Boards from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Boards.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Boards.
     */
    distinct?: BoardScalarFieldEnum | BoardScalarFieldEnum[]
  }

  /**
   * Board findMany
   */
  export type BoardFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardInclude<ExtArgs> | null
    /**
     * Filter, which Boards to fetch.
     */
    where?: BoardWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Boards to fetch.
     */
    orderBy?: BoardOrderByWithRelationInput | BoardOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Boards.
     */
    cursor?: BoardWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Boards from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Boards.
     */
    skip?: number
    distinct?: BoardScalarFieldEnum | BoardScalarFieldEnum[]
  }

  /**
   * Board create
   */
  export type BoardCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardInclude<ExtArgs> | null
    /**
     * The data needed to create a Board.
     */
    data: XOR<BoardCreateInput, BoardUncheckedCreateInput>
  }

  /**
   * Board createMany
   */
  export type BoardCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Boards.
     */
    data: BoardCreateManyInput | BoardCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Board createManyAndReturn
   */
  export type BoardCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * The data used to create many Boards.
     */
    data: BoardCreateManyInput | BoardCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Board update
   */
  export type BoardUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardInclude<ExtArgs> | null
    /**
     * The data needed to update a Board.
     */
    data: XOR<BoardUpdateInput, BoardUncheckedUpdateInput>
    /**
     * Choose, which Board to update.
     */
    where: BoardWhereUniqueInput
  }

  /**
   * Board updateMany
   */
  export type BoardUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Boards.
     */
    data: XOR<BoardUpdateManyMutationInput, BoardUncheckedUpdateManyInput>
    /**
     * Filter which Boards to update
     */
    where?: BoardWhereInput
    /**
     * Limit how many Boards to update.
     */
    limit?: number
  }

  /**
   * Board updateManyAndReturn
   */
  export type BoardUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * The data used to update Boards.
     */
    data: XOR<BoardUpdateManyMutationInput, BoardUncheckedUpdateManyInput>
    /**
     * Filter which Boards to update
     */
    where?: BoardWhereInput
    /**
     * Limit how many Boards to update.
     */
    limit?: number
  }

  /**
   * Board upsert
   */
  export type BoardUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardInclude<ExtArgs> | null
    /**
     * The filter to search for the Board to update in case it exists.
     */
    where: BoardWhereUniqueInput
    /**
     * In case the Board found by the `where` argument doesn't exist, create a new Board with this data.
     */
    create: XOR<BoardCreateInput, BoardUncheckedCreateInput>
    /**
     * In case the Board was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BoardUpdateInput, BoardUncheckedUpdateInput>
  }

  /**
   * Board delete
   */
  export type BoardDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardInclude<ExtArgs> | null
    /**
     * Filter which Board to delete.
     */
    where: BoardWhereUniqueInput
  }

  /**
   * Board deleteMany
   */
  export type BoardDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Boards to delete
     */
    where?: BoardWhereInput
    /**
     * Limit how many Boards to delete.
     */
    limit?: number
  }

  /**
   * Board.boardSections
   */
  export type Board$boardSectionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionInclude<ExtArgs> | null
    where?: BoardSectionWhereInput
    orderBy?: BoardSectionOrderByWithRelationInput | BoardSectionOrderByWithRelationInput[]
    cursor?: BoardSectionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BoardSectionScalarFieldEnum | BoardSectionScalarFieldEnum[]
  }

  /**
   * Board.embedding
   */
  export type Board$embeddingArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardEmbedding
     */
    select?: BoardEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardEmbedding
     */
    omit?: BoardEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardEmbeddingInclude<ExtArgs> | null
    where?: BoardEmbeddingWhereInput
  }

  /**
   * Board without action
   */
  export type BoardDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Board
     */
    select?: BoardSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Board
     */
    omit?: BoardOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardInclude<ExtArgs> | null
  }


  /**
   * Model BoardSection
   */

  export type AggregateBoardSection = {
    _count: BoardSectionCountAggregateOutputType | null
    _avg: BoardSectionAvgAggregateOutputType | null
    _sum: BoardSectionSumAggregateOutputType | null
    _min: BoardSectionMinAggregateOutputType | null
    _max: BoardSectionMaxAggregateOutputType | null
  }

  export type BoardSectionAvgAggregateOutputType = {
    position: number | null
  }

  export type BoardSectionSumAggregateOutputType = {
    position: number | null
  }

  export type BoardSectionMinAggregateOutputType = {
    id: string | null
    name: string | null
    position: number | null
    createdAt: Date | null
    updatedAt: Date | null
    boardId: string | null
  }

  export type BoardSectionMaxAggregateOutputType = {
    id: string | null
    name: string | null
    position: number | null
    createdAt: Date | null
    updatedAt: Date | null
    boardId: string | null
  }

  export type BoardSectionCountAggregateOutputType = {
    id: number
    name: number
    position: number
    createdAt: number
    updatedAt: number
    boardId: number
    _all: number
  }


  export type BoardSectionAvgAggregateInputType = {
    position?: true
  }

  export type BoardSectionSumAggregateInputType = {
    position?: true
  }

  export type BoardSectionMinAggregateInputType = {
    id?: true
    name?: true
    position?: true
    createdAt?: true
    updatedAt?: true
    boardId?: true
  }

  export type BoardSectionMaxAggregateInputType = {
    id?: true
    name?: true
    position?: true
    createdAt?: true
    updatedAt?: true
    boardId?: true
  }

  export type BoardSectionCountAggregateInputType = {
    id?: true
    name?: true
    position?: true
    createdAt?: true
    updatedAt?: true
    boardId?: true
    _all?: true
  }

  export type BoardSectionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BoardSection to aggregate.
     */
    where?: BoardSectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BoardSections to fetch.
     */
    orderBy?: BoardSectionOrderByWithRelationInput | BoardSectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BoardSectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BoardSections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BoardSections.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned BoardSections
    **/
    _count?: true | BoardSectionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: BoardSectionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: BoardSectionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BoardSectionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BoardSectionMaxAggregateInputType
  }

  export type GetBoardSectionAggregateType<T extends BoardSectionAggregateArgs> = {
        [P in keyof T & keyof AggregateBoardSection]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBoardSection[P]>
      : GetScalarType<T[P], AggregateBoardSection[P]>
  }




  export type BoardSectionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BoardSectionWhereInput
    orderBy?: BoardSectionOrderByWithAggregationInput | BoardSectionOrderByWithAggregationInput[]
    by: BoardSectionScalarFieldEnum[] | BoardSectionScalarFieldEnum
    having?: BoardSectionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BoardSectionCountAggregateInputType | true
    _avg?: BoardSectionAvgAggregateInputType
    _sum?: BoardSectionSumAggregateInputType
    _min?: BoardSectionMinAggregateInputType
    _max?: BoardSectionMaxAggregateInputType
  }

  export type BoardSectionGroupByOutputType = {
    id: string
    name: string
    position: number
    createdAt: Date
    updatedAt: Date
    boardId: string
    _count: BoardSectionCountAggregateOutputType | null
    _avg: BoardSectionAvgAggregateOutputType | null
    _sum: BoardSectionSumAggregateOutputType | null
    _min: BoardSectionMinAggregateOutputType | null
    _max: BoardSectionMaxAggregateOutputType | null
  }

  type GetBoardSectionGroupByPayload<T extends BoardSectionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BoardSectionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BoardSectionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BoardSectionGroupByOutputType[P]>
            : GetScalarType<T[P], BoardSectionGroupByOutputType[P]>
        }
      >
    >


  export type BoardSectionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    position?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    boardId?: boolean
    board?: boolean | BoardDefaultArgs<ExtArgs>
    tasks?: boolean | BoardSection$tasksArgs<ExtArgs>
    _count?: boolean | BoardSectionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["boardSection"]>

  export type BoardSectionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    position?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    boardId?: boolean
    board?: boolean | BoardDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["boardSection"]>

  export type BoardSectionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    position?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    boardId?: boolean
    board?: boolean | BoardDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["boardSection"]>

  export type BoardSectionSelectScalar = {
    id?: boolean
    name?: boolean
    position?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    boardId?: boolean
  }

  export type BoardSectionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "position" | "createdAt" | "updatedAt" | "boardId", ExtArgs["result"]["boardSection"]>
  export type BoardSectionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    board?: boolean | BoardDefaultArgs<ExtArgs>
    tasks?: boolean | BoardSection$tasksArgs<ExtArgs>
    _count?: boolean | BoardSectionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type BoardSectionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    board?: boolean | BoardDefaultArgs<ExtArgs>
  }
  export type BoardSectionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    board?: boolean | BoardDefaultArgs<ExtArgs>
  }

  export type $BoardSectionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "BoardSection"
    objects: {
      board: Prisma.$BoardPayload<ExtArgs>
      tasks: Prisma.$TaskPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      position: number
      createdAt: Date
      updatedAt: Date
      boardId: string
    }, ExtArgs["result"]["boardSection"]>
    composites: {}
  }

  type BoardSectionGetPayload<S extends boolean | null | undefined | BoardSectionDefaultArgs> = $Result.GetResult<Prisma.$BoardSectionPayload, S>

  type BoardSectionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BoardSectionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BoardSectionCountAggregateInputType | true
    }

  export interface BoardSectionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BoardSection'], meta: { name: 'BoardSection' } }
    /**
     * Find zero or one BoardSection that matches the filter.
     * @param {BoardSectionFindUniqueArgs} args - Arguments to find a BoardSection
     * @example
     * // Get one BoardSection
     * const boardSection = await prisma.boardSection.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BoardSectionFindUniqueArgs>(args: SelectSubset<T, BoardSectionFindUniqueArgs<ExtArgs>>): Prisma__BoardSectionClient<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one BoardSection that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BoardSectionFindUniqueOrThrowArgs} args - Arguments to find a BoardSection
     * @example
     * // Get one BoardSection
     * const boardSection = await prisma.boardSection.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BoardSectionFindUniqueOrThrowArgs>(args: SelectSubset<T, BoardSectionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BoardSectionClient<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BoardSection that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardSectionFindFirstArgs} args - Arguments to find a BoardSection
     * @example
     * // Get one BoardSection
     * const boardSection = await prisma.boardSection.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BoardSectionFindFirstArgs>(args?: SelectSubset<T, BoardSectionFindFirstArgs<ExtArgs>>): Prisma__BoardSectionClient<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BoardSection that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardSectionFindFirstOrThrowArgs} args - Arguments to find a BoardSection
     * @example
     * // Get one BoardSection
     * const boardSection = await prisma.boardSection.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BoardSectionFindFirstOrThrowArgs>(args?: SelectSubset<T, BoardSectionFindFirstOrThrowArgs<ExtArgs>>): Prisma__BoardSectionClient<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more BoardSections that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardSectionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BoardSections
     * const boardSections = await prisma.boardSection.findMany()
     * 
     * // Get first 10 BoardSections
     * const boardSections = await prisma.boardSection.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const boardSectionWithIdOnly = await prisma.boardSection.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BoardSectionFindManyArgs>(args?: SelectSubset<T, BoardSectionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a BoardSection.
     * @param {BoardSectionCreateArgs} args - Arguments to create a BoardSection.
     * @example
     * // Create one BoardSection
     * const BoardSection = await prisma.boardSection.create({
     *   data: {
     *     // ... data to create a BoardSection
     *   }
     * })
     * 
     */
    create<T extends BoardSectionCreateArgs>(args: SelectSubset<T, BoardSectionCreateArgs<ExtArgs>>): Prisma__BoardSectionClient<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many BoardSections.
     * @param {BoardSectionCreateManyArgs} args - Arguments to create many BoardSections.
     * @example
     * // Create many BoardSections
     * const boardSection = await prisma.boardSection.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BoardSectionCreateManyArgs>(args?: SelectSubset<T, BoardSectionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many BoardSections and returns the data saved in the database.
     * @param {BoardSectionCreateManyAndReturnArgs} args - Arguments to create many BoardSections.
     * @example
     * // Create many BoardSections
     * const boardSection = await prisma.boardSection.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many BoardSections and only return the `id`
     * const boardSectionWithIdOnly = await prisma.boardSection.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BoardSectionCreateManyAndReturnArgs>(args?: SelectSubset<T, BoardSectionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a BoardSection.
     * @param {BoardSectionDeleteArgs} args - Arguments to delete one BoardSection.
     * @example
     * // Delete one BoardSection
     * const BoardSection = await prisma.boardSection.delete({
     *   where: {
     *     // ... filter to delete one BoardSection
     *   }
     * })
     * 
     */
    delete<T extends BoardSectionDeleteArgs>(args: SelectSubset<T, BoardSectionDeleteArgs<ExtArgs>>): Prisma__BoardSectionClient<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one BoardSection.
     * @param {BoardSectionUpdateArgs} args - Arguments to update one BoardSection.
     * @example
     * // Update one BoardSection
     * const boardSection = await prisma.boardSection.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BoardSectionUpdateArgs>(args: SelectSubset<T, BoardSectionUpdateArgs<ExtArgs>>): Prisma__BoardSectionClient<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more BoardSections.
     * @param {BoardSectionDeleteManyArgs} args - Arguments to filter BoardSections to delete.
     * @example
     * // Delete a few BoardSections
     * const { count } = await prisma.boardSection.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BoardSectionDeleteManyArgs>(args?: SelectSubset<T, BoardSectionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BoardSections.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardSectionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BoardSections
     * const boardSection = await prisma.boardSection.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BoardSectionUpdateManyArgs>(args: SelectSubset<T, BoardSectionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BoardSections and returns the data updated in the database.
     * @param {BoardSectionUpdateManyAndReturnArgs} args - Arguments to update many BoardSections.
     * @example
     * // Update many BoardSections
     * const boardSection = await prisma.boardSection.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more BoardSections and only return the `id`
     * const boardSectionWithIdOnly = await prisma.boardSection.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BoardSectionUpdateManyAndReturnArgs>(args: SelectSubset<T, BoardSectionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one BoardSection.
     * @param {BoardSectionUpsertArgs} args - Arguments to update or create a BoardSection.
     * @example
     * // Update or create a BoardSection
     * const boardSection = await prisma.boardSection.upsert({
     *   create: {
     *     // ... data to create a BoardSection
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the BoardSection we want to update
     *   }
     * })
     */
    upsert<T extends BoardSectionUpsertArgs>(args: SelectSubset<T, BoardSectionUpsertArgs<ExtArgs>>): Prisma__BoardSectionClient<$Result.GetResult<Prisma.$BoardSectionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of BoardSections.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardSectionCountArgs} args - Arguments to filter BoardSections to count.
     * @example
     * // Count the number of BoardSections
     * const count = await prisma.boardSection.count({
     *   where: {
     *     // ... the filter for the BoardSections we want to count
     *   }
     * })
    **/
    count<T extends BoardSectionCountArgs>(
      args?: Subset<T, BoardSectionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BoardSectionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a BoardSection.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardSectionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BoardSectionAggregateArgs>(args: Subset<T, BoardSectionAggregateArgs>): Prisma.PrismaPromise<GetBoardSectionAggregateType<T>>

    /**
     * Group by BoardSection.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardSectionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BoardSectionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BoardSectionGroupByArgs['orderBy'] }
        : { orderBy?: BoardSectionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BoardSectionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBoardSectionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the BoardSection model
   */
  readonly fields: BoardSectionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for BoardSection.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BoardSectionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    board<T extends BoardDefaultArgs<ExtArgs> = {}>(args?: Subset<T, BoardDefaultArgs<ExtArgs>>): Prisma__BoardClient<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    tasks<T extends BoardSection$tasksArgs<ExtArgs> = {}>(args?: Subset<T, BoardSection$tasksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the BoardSection model
   */
  interface BoardSectionFieldRefs {
    readonly id: FieldRef<"BoardSection", 'String'>
    readonly name: FieldRef<"BoardSection", 'String'>
    readonly position: FieldRef<"BoardSection", 'Int'>
    readonly createdAt: FieldRef<"BoardSection", 'DateTime'>
    readonly updatedAt: FieldRef<"BoardSection", 'DateTime'>
    readonly boardId: FieldRef<"BoardSection", 'String'>
  }
    

  // Custom InputTypes
  /**
   * BoardSection findUnique
   */
  export type BoardSectionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionInclude<ExtArgs> | null
    /**
     * Filter, which BoardSection to fetch.
     */
    where: BoardSectionWhereUniqueInput
  }

  /**
   * BoardSection findUniqueOrThrow
   */
  export type BoardSectionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionInclude<ExtArgs> | null
    /**
     * Filter, which BoardSection to fetch.
     */
    where: BoardSectionWhereUniqueInput
  }

  /**
   * BoardSection findFirst
   */
  export type BoardSectionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionInclude<ExtArgs> | null
    /**
     * Filter, which BoardSection to fetch.
     */
    where?: BoardSectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BoardSections to fetch.
     */
    orderBy?: BoardSectionOrderByWithRelationInput | BoardSectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BoardSections.
     */
    cursor?: BoardSectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BoardSections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BoardSections.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BoardSections.
     */
    distinct?: BoardSectionScalarFieldEnum | BoardSectionScalarFieldEnum[]
  }

  /**
   * BoardSection findFirstOrThrow
   */
  export type BoardSectionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionInclude<ExtArgs> | null
    /**
     * Filter, which BoardSection to fetch.
     */
    where?: BoardSectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BoardSections to fetch.
     */
    orderBy?: BoardSectionOrderByWithRelationInput | BoardSectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BoardSections.
     */
    cursor?: BoardSectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BoardSections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BoardSections.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BoardSections.
     */
    distinct?: BoardSectionScalarFieldEnum | BoardSectionScalarFieldEnum[]
  }

  /**
   * BoardSection findMany
   */
  export type BoardSectionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionInclude<ExtArgs> | null
    /**
     * Filter, which BoardSections to fetch.
     */
    where?: BoardSectionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BoardSections to fetch.
     */
    orderBy?: BoardSectionOrderByWithRelationInput | BoardSectionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing BoardSections.
     */
    cursor?: BoardSectionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BoardSections from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BoardSections.
     */
    skip?: number
    distinct?: BoardSectionScalarFieldEnum | BoardSectionScalarFieldEnum[]
  }

  /**
   * BoardSection create
   */
  export type BoardSectionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionInclude<ExtArgs> | null
    /**
     * The data needed to create a BoardSection.
     */
    data: XOR<BoardSectionCreateInput, BoardSectionUncheckedCreateInput>
  }

  /**
   * BoardSection createMany
   */
  export type BoardSectionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many BoardSections.
     */
    data: BoardSectionCreateManyInput | BoardSectionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BoardSection createManyAndReturn
   */
  export type BoardSectionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * The data used to create many BoardSections.
     */
    data: BoardSectionCreateManyInput | BoardSectionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * BoardSection update
   */
  export type BoardSectionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionInclude<ExtArgs> | null
    /**
     * The data needed to update a BoardSection.
     */
    data: XOR<BoardSectionUpdateInput, BoardSectionUncheckedUpdateInput>
    /**
     * Choose, which BoardSection to update.
     */
    where: BoardSectionWhereUniqueInput
  }

  /**
   * BoardSection updateMany
   */
  export type BoardSectionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update BoardSections.
     */
    data: XOR<BoardSectionUpdateManyMutationInput, BoardSectionUncheckedUpdateManyInput>
    /**
     * Filter which BoardSections to update
     */
    where?: BoardSectionWhereInput
    /**
     * Limit how many BoardSections to update.
     */
    limit?: number
  }

  /**
   * BoardSection updateManyAndReturn
   */
  export type BoardSectionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * The data used to update BoardSections.
     */
    data: XOR<BoardSectionUpdateManyMutationInput, BoardSectionUncheckedUpdateManyInput>
    /**
     * Filter which BoardSections to update
     */
    where?: BoardSectionWhereInput
    /**
     * Limit how many BoardSections to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * BoardSection upsert
   */
  export type BoardSectionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionInclude<ExtArgs> | null
    /**
     * The filter to search for the BoardSection to update in case it exists.
     */
    where: BoardSectionWhereUniqueInput
    /**
     * In case the BoardSection found by the `where` argument doesn't exist, create a new BoardSection with this data.
     */
    create: XOR<BoardSectionCreateInput, BoardSectionUncheckedCreateInput>
    /**
     * In case the BoardSection was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BoardSectionUpdateInput, BoardSectionUncheckedUpdateInput>
  }

  /**
   * BoardSection delete
   */
  export type BoardSectionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionInclude<ExtArgs> | null
    /**
     * Filter which BoardSection to delete.
     */
    where: BoardSectionWhereUniqueInput
  }

  /**
   * BoardSection deleteMany
   */
  export type BoardSectionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BoardSections to delete
     */
    where?: BoardSectionWhereInput
    /**
     * Limit how many BoardSections to delete.
     */
    limit?: number
  }

  /**
   * BoardSection.tasks
   */
  export type BoardSection$tasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Task
     */
    omit?: TaskOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null
    where?: TaskWhereInput
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[]
    cursor?: TaskWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[]
  }

  /**
   * BoardSection without action
   */
  export type BoardSectionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardSection
     */
    select?: BoardSectionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardSection
     */
    omit?: BoardSectionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardSectionInclude<ExtArgs> | null
  }


  /**
   * Model TaskHistory
   */

  export type AggregateTaskHistory = {
    _count: TaskHistoryCountAggregateOutputType | null
    _min: TaskHistoryMinAggregateOutputType | null
    _max: TaskHistoryMaxAggregateOutputType | null
  }

  export type TaskHistoryMinAggregateOutputType = {
    id: string | null
    taskId: string | null
    createdAt: Date | null
    updatedAt: Date | null
    description: string | null
  }

  export type TaskHistoryMaxAggregateOutputType = {
    id: string | null
    taskId: string | null
    createdAt: Date | null
    updatedAt: Date | null
    description: string | null
  }

  export type TaskHistoryCountAggregateOutputType = {
    id: number
    taskId: number
    createdAt: number
    updatedAt: number
    description: number
    _all: number
  }


  export type TaskHistoryMinAggregateInputType = {
    id?: true
    taskId?: true
    createdAt?: true
    updatedAt?: true
    description?: true
  }

  export type TaskHistoryMaxAggregateInputType = {
    id?: true
    taskId?: true
    createdAt?: true
    updatedAt?: true
    description?: true
  }

  export type TaskHistoryCountAggregateInputType = {
    id?: true
    taskId?: true
    createdAt?: true
    updatedAt?: true
    description?: true
    _all?: true
  }

  export type TaskHistoryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TaskHistory to aggregate.
     */
    where?: TaskHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskHistories to fetch.
     */
    orderBy?: TaskHistoryOrderByWithRelationInput | TaskHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TaskHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TaskHistories
    **/
    _count?: true | TaskHistoryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TaskHistoryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TaskHistoryMaxAggregateInputType
  }

  export type GetTaskHistoryAggregateType<T extends TaskHistoryAggregateArgs> = {
        [P in keyof T & keyof AggregateTaskHistory]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTaskHistory[P]>
      : GetScalarType<T[P], AggregateTaskHistory[P]>
  }




  export type TaskHistoryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskHistoryWhereInput
    orderBy?: TaskHistoryOrderByWithAggregationInput | TaskHistoryOrderByWithAggregationInput[]
    by: TaskHistoryScalarFieldEnum[] | TaskHistoryScalarFieldEnum
    having?: TaskHistoryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TaskHistoryCountAggregateInputType | true
    _min?: TaskHistoryMinAggregateInputType
    _max?: TaskHistoryMaxAggregateInputType
  }

  export type TaskHistoryGroupByOutputType = {
    id: string
    taskId: string
    createdAt: Date
    updatedAt: Date
    description: string | null
    _count: TaskHistoryCountAggregateOutputType | null
    _min: TaskHistoryMinAggregateOutputType | null
    _max: TaskHistoryMaxAggregateOutputType | null
  }

  type GetTaskHistoryGroupByPayload<T extends TaskHistoryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TaskHistoryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TaskHistoryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TaskHistoryGroupByOutputType[P]>
            : GetScalarType<T[P], TaskHistoryGroupByOutputType[P]>
        }
      >
    >


  export type TaskHistorySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    taskId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    description?: boolean
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["taskHistory"]>

  export type TaskHistorySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    taskId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    description?: boolean
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["taskHistory"]>

  export type TaskHistorySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    taskId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    description?: boolean
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["taskHistory"]>

  export type TaskHistorySelectScalar = {
    id?: boolean
    taskId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    description?: boolean
  }

  export type TaskHistoryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "taskId" | "createdAt" | "updatedAt" | "description", ExtArgs["result"]["taskHistory"]>
  export type TaskHistoryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }
  export type TaskHistoryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }
  export type TaskHistoryIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }

  export type $TaskHistoryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TaskHistory"
    objects: {
      task: Prisma.$TaskPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      taskId: string
      createdAt: Date
      updatedAt: Date
      description: string | null
    }, ExtArgs["result"]["taskHistory"]>
    composites: {}
  }

  type TaskHistoryGetPayload<S extends boolean | null | undefined | TaskHistoryDefaultArgs> = $Result.GetResult<Prisma.$TaskHistoryPayload, S>

  type TaskHistoryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TaskHistoryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TaskHistoryCountAggregateInputType | true
    }

  export interface TaskHistoryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TaskHistory'], meta: { name: 'TaskHistory' } }
    /**
     * Find zero or one TaskHistory that matches the filter.
     * @param {TaskHistoryFindUniqueArgs} args - Arguments to find a TaskHistory
     * @example
     * // Get one TaskHistory
     * const taskHistory = await prisma.taskHistory.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TaskHistoryFindUniqueArgs>(args: SelectSubset<T, TaskHistoryFindUniqueArgs<ExtArgs>>): Prisma__TaskHistoryClient<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TaskHistory that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TaskHistoryFindUniqueOrThrowArgs} args - Arguments to find a TaskHistory
     * @example
     * // Get one TaskHistory
     * const taskHistory = await prisma.taskHistory.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TaskHistoryFindUniqueOrThrowArgs>(args: SelectSubset<T, TaskHistoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TaskHistoryClient<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TaskHistory that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskHistoryFindFirstArgs} args - Arguments to find a TaskHistory
     * @example
     * // Get one TaskHistory
     * const taskHistory = await prisma.taskHistory.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TaskHistoryFindFirstArgs>(args?: SelectSubset<T, TaskHistoryFindFirstArgs<ExtArgs>>): Prisma__TaskHistoryClient<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TaskHistory that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskHistoryFindFirstOrThrowArgs} args - Arguments to find a TaskHistory
     * @example
     * // Get one TaskHistory
     * const taskHistory = await prisma.taskHistory.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TaskHistoryFindFirstOrThrowArgs>(args?: SelectSubset<T, TaskHistoryFindFirstOrThrowArgs<ExtArgs>>): Prisma__TaskHistoryClient<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TaskHistories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskHistoryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TaskHistories
     * const taskHistories = await prisma.taskHistory.findMany()
     * 
     * // Get first 10 TaskHistories
     * const taskHistories = await prisma.taskHistory.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const taskHistoryWithIdOnly = await prisma.taskHistory.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TaskHistoryFindManyArgs>(args?: SelectSubset<T, TaskHistoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TaskHistory.
     * @param {TaskHistoryCreateArgs} args - Arguments to create a TaskHistory.
     * @example
     * // Create one TaskHistory
     * const TaskHistory = await prisma.taskHistory.create({
     *   data: {
     *     // ... data to create a TaskHistory
     *   }
     * })
     * 
     */
    create<T extends TaskHistoryCreateArgs>(args: SelectSubset<T, TaskHistoryCreateArgs<ExtArgs>>): Prisma__TaskHistoryClient<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TaskHistories.
     * @param {TaskHistoryCreateManyArgs} args - Arguments to create many TaskHistories.
     * @example
     * // Create many TaskHistories
     * const taskHistory = await prisma.taskHistory.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TaskHistoryCreateManyArgs>(args?: SelectSubset<T, TaskHistoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TaskHistories and returns the data saved in the database.
     * @param {TaskHistoryCreateManyAndReturnArgs} args - Arguments to create many TaskHistories.
     * @example
     * // Create many TaskHistories
     * const taskHistory = await prisma.taskHistory.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TaskHistories and only return the `id`
     * const taskHistoryWithIdOnly = await prisma.taskHistory.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TaskHistoryCreateManyAndReturnArgs>(args?: SelectSubset<T, TaskHistoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TaskHistory.
     * @param {TaskHistoryDeleteArgs} args - Arguments to delete one TaskHistory.
     * @example
     * // Delete one TaskHistory
     * const TaskHistory = await prisma.taskHistory.delete({
     *   where: {
     *     // ... filter to delete one TaskHistory
     *   }
     * })
     * 
     */
    delete<T extends TaskHistoryDeleteArgs>(args: SelectSubset<T, TaskHistoryDeleteArgs<ExtArgs>>): Prisma__TaskHistoryClient<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TaskHistory.
     * @param {TaskHistoryUpdateArgs} args - Arguments to update one TaskHistory.
     * @example
     * // Update one TaskHistory
     * const taskHistory = await prisma.taskHistory.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TaskHistoryUpdateArgs>(args: SelectSubset<T, TaskHistoryUpdateArgs<ExtArgs>>): Prisma__TaskHistoryClient<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TaskHistories.
     * @param {TaskHistoryDeleteManyArgs} args - Arguments to filter TaskHistories to delete.
     * @example
     * // Delete a few TaskHistories
     * const { count } = await prisma.taskHistory.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TaskHistoryDeleteManyArgs>(args?: SelectSubset<T, TaskHistoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TaskHistories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskHistoryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TaskHistories
     * const taskHistory = await prisma.taskHistory.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TaskHistoryUpdateManyArgs>(args: SelectSubset<T, TaskHistoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TaskHistories and returns the data updated in the database.
     * @param {TaskHistoryUpdateManyAndReturnArgs} args - Arguments to update many TaskHistories.
     * @example
     * // Update many TaskHistories
     * const taskHistory = await prisma.taskHistory.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TaskHistories and only return the `id`
     * const taskHistoryWithIdOnly = await prisma.taskHistory.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TaskHistoryUpdateManyAndReturnArgs>(args: SelectSubset<T, TaskHistoryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TaskHistory.
     * @param {TaskHistoryUpsertArgs} args - Arguments to update or create a TaskHistory.
     * @example
     * // Update or create a TaskHistory
     * const taskHistory = await prisma.taskHistory.upsert({
     *   create: {
     *     // ... data to create a TaskHistory
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TaskHistory we want to update
     *   }
     * })
     */
    upsert<T extends TaskHistoryUpsertArgs>(args: SelectSubset<T, TaskHistoryUpsertArgs<ExtArgs>>): Prisma__TaskHistoryClient<$Result.GetResult<Prisma.$TaskHistoryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TaskHistories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskHistoryCountArgs} args - Arguments to filter TaskHistories to count.
     * @example
     * // Count the number of TaskHistories
     * const count = await prisma.taskHistory.count({
     *   where: {
     *     // ... the filter for the TaskHistories we want to count
     *   }
     * })
    **/
    count<T extends TaskHistoryCountArgs>(
      args?: Subset<T, TaskHistoryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TaskHistoryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TaskHistory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskHistoryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TaskHistoryAggregateArgs>(args: Subset<T, TaskHistoryAggregateArgs>): Prisma.PrismaPromise<GetTaskHistoryAggregateType<T>>

    /**
     * Group by TaskHistory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskHistoryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TaskHistoryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TaskHistoryGroupByArgs['orderBy'] }
        : { orderBy?: TaskHistoryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TaskHistoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTaskHistoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TaskHistory model
   */
  readonly fields: TaskHistoryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TaskHistory.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TaskHistoryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    task<T extends TaskDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TaskDefaultArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TaskHistory model
   */
  interface TaskHistoryFieldRefs {
    readonly id: FieldRef<"TaskHistory", 'String'>
    readonly taskId: FieldRef<"TaskHistory", 'String'>
    readonly createdAt: FieldRef<"TaskHistory", 'DateTime'>
    readonly updatedAt: FieldRef<"TaskHistory", 'DateTime'>
    readonly description: FieldRef<"TaskHistory", 'String'>
  }
    

  // Custom InputTypes
  /**
   * TaskHistory findUnique
   */
  export type TaskHistoryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryInclude<ExtArgs> | null
    /**
     * Filter, which TaskHistory to fetch.
     */
    where: TaskHistoryWhereUniqueInput
  }

  /**
   * TaskHistory findUniqueOrThrow
   */
  export type TaskHistoryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryInclude<ExtArgs> | null
    /**
     * Filter, which TaskHistory to fetch.
     */
    where: TaskHistoryWhereUniqueInput
  }

  /**
   * TaskHistory findFirst
   */
  export type TaskHistoryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryInclude<ExtArgs> | null
    /**
     * Filter, which TaskHistory to fetch.
     */
    where?: TaskHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskHistories to fetch.
     */
    orderBy?: TaskHistoryOrderByWithRelationInput | TaskHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TaskHistories.
     */
    cursor?: TaskHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TaskHistories.
     */
    distinct?: TaskHistoryScalarFieldEnum | TaskHistoryScalarFieldEnum[]
  }

  /**
   * TaskHistory findFirstOrThrow
   */
  export type TaskHistoryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryInclude<ExtArgs> | null
    /**
     * Filter, which TaskHistory to fetch.
     */
    where?: TaskHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskHistories to fetch.
     */
    orderBy?: TaskHistoryOrderByWithRelationInput | TaskHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TaskHistories.
     */
    cursor?: TaskHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TaskHistories.
     */
    distinct?: TaskHistoryScalarFieldEnum | TaskHistoryScalarFieldEnum[]
  }

  /**
   * TaskHistory findMany
   */
  export type TaskHistoryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryInclude<ExtArgs> | null
    /**
     * Filter, which TaskHistories to fetch.
     */
    where?: TaskHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskHistories to fetch.
     */
    orderBy?: TaskHistoryOrderByWithRelationInput | TaskHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TaskHistories.
     */
    cursor?: TaskHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskHistories.
     */
    skip?: number
    distinct?: TaskHistoryScalarFieldEnum | TaskHistoryScalarFieldEnum[]
  }

  /**
   * TaskHistory create
   */
  export type TaskHistoryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryInclude<ExtArgs> | null
    /**
     * The data needed to create a TaskHistory.
     */
    data: XOR<TaskHistoryCreateInput, TaskHistoryUncheckedCreateInput>
  }

  /**
   * TaskHistory createMany
   */
  export type TaskHistoryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TaskHistories.
     */
    data: TaskHistoryCreateManyInput | TaskHistoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TaskHistory createManyAndReturn
   */
  export type TaskHistoryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * The data used to create many TaskHistories.
     */
    data: TaskHistoryCreateManyInput | TaskHistoryCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TaskHistory update
   */
  export type TaskHistoryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryInclude<ExtArgs> | null
    /**
     * The data needed to update a TaskHistory.
     */
    data: XOR<TaskHistoryUpdateInput, TaskHistoryUncheckedUpdateInput>
    /**
     * Choose, which TaskHistory to update.
     */
    where: TaskHistoryWhereUniqueInput
  }

  /**
   * TaskHistory updateMany
   */
  export type TaskHistoryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TaskHistories.
     */
    data: XOR<TaskHistoryUpdateManyMutationInput, TaskHistoryUncheckedUpdateManyInput>
    /**
     * Filter which TaskHistories to update
     */
    where?: TaskHistoryWhereInput
    /**
     * Limit how many TaskHistories to update.
     */
    limit?: number
  }

  /**
   * TaskHistory updateManyAndReturn
   */
  export type TaskHistoryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * The data used to update TaskHistories.
     */
    data: XOR<TaskHistoryUpdateManyMutationInput, TaskHistoryUncheckedUpdateManyInput>
    /**
     * Filter which TaskHistories to update
     */
    where?: TaskHistoryWhereInput
    /**
     * Limit how many TaskHistories to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TaskHistory upsert
   */
  export type TaskHistoryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryInclude<ExtArgs> | null
    /**
     * The filter to search for the TaskHistory to update in case it exists.
     */
    where: TaskHistoryWhereUniqueInput
    /**
     * In case the TaskHistory found by the `where` argument doesn't exist, create a new TaskHistory with this data.
     */
    create: XOR<TaskHistoryCreateInput, TaskHistoryUncheckedCreateInput>
    /**
     * In case the TaskHistory was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TaskHistoryUpdateInput, TaskHistoryUncheckedUpdateInput>
  }

  /**
   * TaskHistory delete
   */
  export type TaskHistoryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryInclude<ExtArgs> | null
    /**
     * Filter which TaskHistory to delete.
     */
    where: TaskHistoryWhereUniqueInput
  }

  /**
   * TaskHistory deleteMany
   */
  export type TaskHistoryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TaskHistories to delete
     */
    where?: TaskHistoryWhereInput
    /**
     * Limit how many TaskHistories to delete.
     */
    limit?: number
  }

  /**
   * TaskHistory without action
   */
  export type TaskHistoryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskHistory
     */
    select?: TaskHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskHistory
     */
    omit?: TaskHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskHistoryInclude<ExtArgs> | null
  }


  /**
   * Model TaskEmbedding
   */

  export type AggregateTaskEmbedding = {
    _count: TaskEmbeddingCountAggregateOutputType | null
    _min: TaskEmbeddingMinAggregateOutputType | null
    _max: TaskEmbeddingMaxAggregateOutputType | null
  }

  export type TaskEmbeddingMinAggregateOutputType = {
    id: string | null
    taskId: string | null
    content: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskEmbeddingMaxAggregateOutputType = {
    id: string | null
    taskId: string | null
    content: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TaskEmbeddingCountAggregateOutputType = {
    id: number
    taskId: number
    content: number
    metadata: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TaskEmbeddingMinAggregateInputType = {
    id?: true
    taskId?: true
    content?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskEmbeddingMaxAggregateInputType = {
    id?: true
    taskId?: true
    content?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TaskEmbeddingCountAggregateInputType = {
    id?: true
    taskId?: true
    content?: true
    metadata?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TaskEmbeddingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TaskEmbedding to aggregate.
     */
    where?: TaskEmbeddingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskEmbeddings to fetch.
     */
    orderBy?: TaskEmbeddingOrderByWithRelationInput | TaskEmbeddingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TaskEmbeddingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskEmbeddings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskEmbeddings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TaskEmbeddings
    **/
    _count?: true | TaskEmbeddingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TaskEmbeddingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TaskEmbeddingMaxAggregateInputType
  }

  export type GetTaskEmbeddingAggregateType<T extends TaskEmbeddingAggregateArgs> = {
        [P in keyof T & keyof AggregateTaskEmbedding]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTaskEmbedding[P]>
      : GetScalarType<T[P], AggregateTaskEmbedding[P]>
  }




  export type TaskEmbeddingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TaskEmbeddingWhereInput
    orderBy?: TaskEmbeddingOrderByWithAggregationInput | TaskEmbeddingOrderByWithAggregationInput[]
    by: TaskEmbeddingScalarFieldEnum[] | TaskEmbeddingScalarFieldEnum
    having?: TaskEmbeddingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TaskEmbeddingCountAggregateInputType | true
    _min?: TaskEmbeddingMinAggregateInputType
    _max?: TaskEmbeddingMaxAggregateInputType
  }

  export type TaskEmbeddingGroupByOutputType = {
    id: string
    taskId: string
    content: string
    metadata: JsonValue
    createdAt: Date
    updatedAt: Date
    _count: TaskEmbeddingCountAggregateOutputType | null
    _min: TaskEmbeddingMinAggregateOutputType | null
    _max: TaskEmbeddingMaxAggregateOutputType | null
  }

  type GetTaskEmbeddingGroupByPayload<T extends TaskEmbeddingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TaskEmbeddingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TaskEmbeddingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TaskEmbeddingGroupByOutputType[P]>
            : GetScalarType<T[P], TaskEmbeddingGroupByOutputType[P]>
        }
      >
    >


  export type TaskEmbeddingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    taskId?: boolean
    content?: boolean
    metadata?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["taskEmbedding"]>


  export type TaskEmbeddingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    taskId?: boolean
    content?: boolean
    metadata?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["taskEmbedding"]>

  export type TaskEmbeddingSelectScalar = {
    id?: boolean
    taskId?: boolean
    content?: boolean
    metadata?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TaskEmbeddingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "taskId" | "content" | "metadata" | "createdAt" | "updatedAt", ExtArgs["result"]["taskEmbedding"]>
  export type TaskEmbeddingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }
  export type TaskEmbeddingIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    task?: boolean | TaskDefaultArgs<ExtArgs>
  }

  export type $TaskEmbeddingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TaskEmbedding"
    objects: {
      task: Prisma.$TaskPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      taskId: string
      content: string
      metadata: Prisma.JsonValue
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["taskEmbedding"]>
    composites: {}
  }

  type TaskEmbeddingGetPayload<S extends boolean | null | undefined | TaskEmbeddingDefaultArgs> = $Result.GetResult<Prisma.$TaskEmbeddingPayload, S>

  type TaskEmbeddingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TaskEmbeddingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TaskEmbeddingCountAggregateInputType | true
    }

  export interface TaskEmbeddingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TaskEmbedding'], meta: { name: 'TaskEmbedding' } }
    /**
     * Find zero or one TaskEmbedding that matches the filter.
     * @param {TaskEmbeddingFindUniqueArgs} args - Arguments to find a TaskEmbedding
     * @example
     * // Get one TaskEmbedding
     * const taskEmbedding = await prisma.taskEmbedding.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TaskEmbeddingFindUniqueArgs>(args: SelectSubset<T, TaskEmbeddingFindUniqueArgs<ExtArgs>>): Prisma__TaskEmbeddingClient<$Result.GetResult<Prisma.$TaskEmbeddingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TaskEmbedding that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TaskEmbeddingFindUniqueOrThrowArgs} args - Arguments to find a TaskEmbedding
     * @example
     * // Get one TaskEmbedding
     * const taskEmbedding = await prisma.taskEmbedding.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TaskEmbeddingFindUniqueOrThrowArgs>(args: SelectSubset<T, TaskEmbeddingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TaskEmbeddingClient<$Result.GetResult<Prisma.$TaskEmbeddingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TaskEmbedding that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskEmbeddingFindFirstArgs} args - Arguments to find a TaskEmbedding
     * @example
     * // Get one TaskEmbedding
     * const taskEmbedding = await prisma.taskEmbedding.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TaskEmbeddingFindFirstArgs>(args?: SelectSubset<T, TaskEmbeddingFindFirstArgs<ExtArgs>>): Prisma__TaskEmbeddingClient<$Result.GetResult<Prisma.$TaskEmbeddingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TaskEmbedding that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskEmbeddingFindFirstOrThrowArgs} args - Arguments to find a TaskEmbedding
     * @example
     * // Get one TaskEmbedding
     * const taskEmbedding = await prisma.taskEmbedding.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TaskEmbeddingFindFirstOrThrowArgs>(args?: SelectSubset<T, TaskEmbeddingFindFirstOrThrowArgs<ExtArgs>>): Prisma__TaskEmbeddingClient<$Result.GetResult<Prisma.$TaskEmbeddingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TaskEmbeddings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskEmbeddingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TaskEmbeddings
     * const taskEmbeddings = await prisma.taskEmbedding.findMany()
     * 
     * // Get first 10 TaskEmbeddings
     * const taskEmbeddings = await prisma.taskEmbedding.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const taskEmbeddingWithIdOnly = await prisma.taskEmbedding.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TaskEmbeddingFindManyArgs>(args?: SelectSubset<T, TaskEmbeddingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskEmbeddingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Delete a TaskEmbedding.
     * @param {TaskEmbeddingDeleteArgs} args - Arguments to delete one TaskEmbedding.
     * @example
     * // Delete one TaskEmbedding
     * const TaskEmbedding = await prisma.taskEmbedding.delete({
     *   where: {
     *     // ... filter to delete one TaskEmbedding
     *   }
     * })
     * 
     */
    delete<T extends TaskEmbeddingDeleteArgs>(args: SelectSubset<T, TaskEmbeddingDeleteArgs<ExtArgs>>): Prisma__TaskEmbeddingClient<$Result.GetResult<Prisma.$TaskEmbeddingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TaskEmbedding.
     * @param {TaskEmbeddingUpdateArgs} args - Arguments to update one TaskEmbedding.
     * @example
     * // Update one TaskEmbedding
     * const taskEmbedding = await prisma.taskEmbedding.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TaskEmbeddingUpdateArgs>(args: SelectSubset<T, TaskEmbeddingUpdateArgs<ExtArgs>>): Prisma__TaskEmbeddingClient<$Result.GetResult<Prisma.$TaskEmbeddingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TaskEmbeddings.
     * @param {TaskEmbeddingDeleteManyArgs} args - Arguments to filter TaskEmbeddings to delete.
     * @example
     * // Delete a few TaskEmbeddings
     * const { count } = await prisma.taskEmbedding.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TaskEmbeddingDeleteManyArgs>(args?: SelectSubset<T, TaskEmbeddingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TaskEmbeddings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskEmbeddingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TaskEmbeddings
     * const taskEmbedding = await prisma.taskEmbedding.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TaskEmbeddingUpdateManyArgs>(args: SelectSubset<T, TaskEmbeddingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TaskEmbeddings and returns the data updated in the database.
     * @param {TaskEmbeddingUpdateManyAndReturnArgs} args - Arguments to update many TaskEmbeddings.
     * @example
     * // Update many TaskEmbeddings
     * const taskEmbedding = await prisma.taskEmbedding.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TaskEmbeddings and only return the `id`
     * const taskEmbeddingWithIdOnly = await prisma.taskEmbedding.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TaskEmbeddingUpdateManyAndReturnArgs>(args: SelectSubset<T, TaskEmbeddingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskEmbeddingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>


    /**
     * Count the number of TaskEmbeddings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskEmbeddingCountArgs} args - Arguments to filter TaskEmbeddings to count.
     * @example
     * // Count the number of TaskEmbeddings
     * const count = await prisma.taskEmbedding.count({
     *   where: {
     *     // ... the filter for the TaskEmbeddings we want to count
     *   }
     * })
    **/
    count<T extends TaskEmbeddingCountArgs>(
      args?: Subset<T, TaskEmbeddingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TaskEmbeddingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TaskEmbedding.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskEmbeddingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TaskEmbeddingAggregateArgs>(args: Subset<T, TaskEmbeddingAggregateArgs>): Prisma.PrismaPromise<GetTaskEmbeddingAggregateType<T>>

    /**
     * Group by TaskEmbedding.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskEmbeddingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TaskEmbeddingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TaskEmbeddingGroupByArgs['orderBy'] }
        : { orderBy?: TaskEmbeddingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TaskEmbeddingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTaskEmbeddingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TaskEmbedding model
   */
  readonly fields: TaskEmbeddingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TaskEmbedding.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TaskEmbeddingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    task<T extends TaskDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TaskDefaultArgs<ExtArgs>>): Prisma__TaskClient<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TaskEmbedding model
   */
  interface TaskEmbeddingFieldRefs {
    readonly id: FieldRef<"TaskEmbedding", 'String'>
    readonly taskId: FieldRef<"TaskEmbedding", 'String'>
    readonly content: FieldRef<"TaskEmbedding", 'String'>
    readonly metadata: FieldRef<"TaskEmbedding", 'Json'>
    readonly createdAt: FieldRef<"TaskEmbedding", 'DateTime'>
    readonly updatedAt: FieldRef<"TaskEmbedding", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TaskEmbedding findUnique
   */
  export type TaskEmbeddingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskEmbedding
     */
    select?: TaskEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskEmbedding
     */
    omit?: TaskEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskEmbeddingInclude<ExtArgs> | null
    /**
     * Filter, which TaskEmbedding to fetch.
     */
    where: TaskEmbeddingWhereUniqueInput
  }

  /**
   * TaskEmbedding findUniqueOrThrow
   */
  export type TaskEmbeddingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskEmbedding
     */
    select?: TaskEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskEmbedding
     */
    omit?: TaskEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskEmbeddingInclude<ExtArgs> | null
    /**
     * Filter, which TaskEmbedding to fetch.
     */
    where: TaskEmbeddingWhereUniqueInput
  }

  /**
   * TaskEmbedding findFirst
   */
  export type TaskEmbeddingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskEmbedding
     */
    select?: TaskEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskEmbedding
     */
    omit?: TaskEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskEmbeddingInclude<ExtArgs> | null
    /**
     * Filter, which TaskEmbedding to fetch.
     */
    where?: TaskEmbeddingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskEmbeddings to fetch.
     */
    orderBy?: TaskEmbeddingOrderByWithRelationInput | TaskEmbeddingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TaskEmbeddings.
     */
    cursor?: TaskEmbeddingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskEmbeddings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskEmbeddings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TaskEmbeddings.
     */
    distinct?: TaskEmbeddingScalarFieldEnum | TaskEmbeddingScalarFieldEnum[]
  }

  /**
   * TaskEmbedding findFirstOrThrow
   */
  export type TaskEmbeddingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskEmbedding
     */
    select?: TaskEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskEmbedding
     */
    omit?: TaskEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskEmbeddingInclude<ExtArgs> | null
    /**
     * Filter, which TaskEmbedding to fetch.
     */
    where?: TaskEmbeddingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskEmbeddings to fetch.
     */
    orderBy?: TaskEmbeddingOrderByWithRelationInput | TaskEmbeddingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TaskEmbeddings.
     */
    cursor?: TaskEmbeddingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskEmbeddings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskEmbeddings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TaskEmbeddings.
     */
    distinct?: TaskEmbeddingScalarFieldEnum | TaskEmbeddingScalarFieldEnum[]
  }

  /**
   * TaskEmbedding findMany
   */
  export type TaskEmbeddingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskEmbedding
     */
    select?: TaskEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskEmbedding
     */
    omit?: TaskEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskEmbeddingInclude<ExtArgs> | null
    /**
     * Filter, which TaskEmbeddings to fetch.
     */
    where?: TaskEmbeddingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TaskEmbeddings to fetch.
     */
    orderBy?: TaskEmbeddingOrderByWithRelationInput | TaskEmbeddingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TaskEmbeddings.
     */
    cursor?: TaskEmbeddingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TaskEmbeddings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TaskEmbeddings.
     */
    skip?: number
    distinct?: TaskEmbeddingScalarFieldEnum | TaskEmbeddingScalarFieldEnum[]
  }

  /**
   * TaskEmbedding update
   */
  export type TaskEmbeddingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskEmbedding
     */
    select?: TaskEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskEmbedding
     */
    omit?: TaskEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskEmbeddingInclude<ExtArgs> | null
    /**
     * The data needed to update a TaskEmbedding.
     */
    data: XOR<TaskEmbeddingUpdateInput, TaskEmbeddingUncheckedUpdateInput>
    /**
     * Choose, which TaskEmbedding to update.
     */
    where: TaskEmbeddingWhereUniqueInput
  }

  /**
   * TaskEmbedding updateMany
   */
  export type TaskEmbeddingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TaskEmbeddings.
     */
    data: XOR<TaskEmbeddingUpdateManyMutationInput, TaskEmbeddingUncheckedUpdateManyInput>
    /**
     * Filter which TaskEmbeddings to update
     */
    where?: TaskEmbeddingWhereInput
    /**
     * Limit how many TaskEmbeddings to update.
     */
    limit?: number
  }

  /**
   * TaskEmbedding updateManyAndReturn
   */
  export type TaskEmbeddingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskEmbedding
     */
    select?: TaskEmbeddingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TaskEmbedding
     */
    omit?: TaskEmbeddingOmit<ExtArgs> | null
    /**
     * The data used to update TaskEmbeddings.
     */
    data: XOR<TaskEmbeddingUpdateManyMutationInput, TaskEmbeddingUncheckedUpdateManyInput>
    /**
     * Filter which TaskEmbeddings to update
     */
    where?: TaskEmbeddingWhereInput
    /**
     * Limit how many TaskEmbeddings to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskEmbeddingIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TaskEmbedding delete
   */
  export type TaskEmbeddingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskEmbedding
     */
    select?: TaskEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskEmbedding
     */
    omit?: TaskEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskEmbeddingInclude<ExtArgs> | null
    /**
     * Filter which TaskEmbedding to delete.
     */
    where: TaskEmbeddingWhereUniqueInput
  }

  /**
   * TaskEmbedding deleteMany
   */
  export type TaskEmbeddingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TaskEmbeddings to delete
     */
    where?: TaskEmbeddingWhereInput
    /**
     * Limit how many TaskEmbeddings to delete.
     */
    limit?: number
  }

  /**
   * TaskEmbedding without action
   */
  export type TaskEmbeddingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TaskEmbedding
     */
    select?: TaskEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TaskEmbedding
     */
    omit?: TaskEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskEmbeddingInclude<ExtArgs> | null
  }


  /**
   * Model BoardEmbedding
   */

  export type AggregateBoardEmbedding = {
    _count: BoardEmbeddingCountAggregateOutputType | null
    _min: BoardEmbeddingMinAggregateOutputType | null
    _max: BoardEmbeddingMaxAggregateOutputType | null
  }

  export type BoardEmbeddingMinAggregateOutputType = {
    id: string | null
    boardId: string | null
    content: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BoardEmbeddingMaxAggregateOutputType = {
    id: string | null
    boardId: string | null
    content: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BoardEmbeddingCountAggregateOutputType = {
    id: number
    boardId: number
    content: number
    metadata: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type BoardEmbeddingMinAggregateInputType = {
    id?: true
    boardId?: true
    content?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BoardEmbeddingMaxAggregateInputType = {
    id?: true
    boardId?: true
    content?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BoardEmbeddingCountAggregateInputType = {
    id?: true
    boardId?: true
    content?: true
    metadata?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type BoardEmbeddingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BoardEmbedding to aggregate.
     */
    where?: BoardEmbeddingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BoardEmbeddings to fetch.
     */
    orderBy?: BoardEmbeddingOrderByWithRelationInput | BoardEmbeddingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BoardEmbeddingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BoardEmbeddings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BoardEmbeddings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned BoardEmbeddings
    **/
    _count?: true | BoardEmbeddingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BoardEmbeddingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BoardEmbeddingMaxAggregateInputType
  }

  export type GetBoardEmbeddingAggregateType<T extends BoardEmbeddingAggregateArgs> = {
        [P in keyof T & keyof AggregateBoardEmbedding]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBoardEmbedding[P]>
      : GetScalarType<T[P], AggregateBoardEmbedding[P]>
  }




  export type BoardEmbeddingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BoardEmbeddingWhereInput
    orderBy?: BoardEmbeddingOrderByWithAggregationInput | BoardEmbeddingOrderByWithAggregationInput[]
    by: BoardEmbeddingScalarFieldEnum[] | BoardEmbeddingScalarFieldEnum
    having?: BoardEmbeddingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BoardEmbeddingCountAggregateInputType | true
    _min?: BoardEmbeddingMinAggregateInputType
    _max?: BoardEmbeddingMaxAggregateInputType
  }

  export type BoardEmbeddingGroupByOutputType = {
    id: string
    boardId: string
    content: string
    metadata: JsonValue
    createdAt: Date
    updatedAt: Date
    _count: BoardEmbeddingCountAggregateOutputType | null
    _min: BoardEmbeddingMinAggregateOutputType | null
    _max: BoardEmbeddingMaxAggregateOutputType | null
  }

  type GetBoardEmbeddingGroupByPayload<T extends BoardEmbeddingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BoardEmbeddingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BoardEmbeddingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BoardEmbeddingGroupByOutputType[P]>
            : GetScalarType<T[P], BoardEmbeddingGroupByOutputType[P]>
        }
      >
    >


  export type BoardEmbeddingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    boardId?: boolean
    content?: boolean
    metadata?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    board?: boolean | BoardDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["boardEmbedding"]>


  export type BoardEmbeddingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    boardId?: boolean
    content?: boolean
    metadata?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    board?: boolean | BoardDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["boardEmbedding"]>

  export type BoardEmbeddingSelectScalar = {
    id?: boolean
    boardId?: boolean
    content?: boolean
    metadata?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type BoardEmbeddingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "boardId" | "content" | "metadata" | "createdAt" | "updatedAt", ExtArgs["result"]["boardEmbedding"]>
  export type BoardEmbeddingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    board?: boolean | BoardDefaultArgs<ExtArgs>
  }
  export type BoardEmbeddingIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    board?: boolean | BoardDefaultArgs<ExtArgs>
  }

  export type $BoardEmbeddingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "BoardEmbedding"
    objects: {
      board: Prisma.$BoardPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      boardId: string
      content: string
      metadata: Prisma.JsonValue
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["boardEmbedding"]>
    composites: {}
  }

  type BoardEmbeddingGetPayload<S extends boolean | null | undefined | BoardEmbeddingDefaultArgs> = $Result.GetResult<Prisma.$BoardEmbeddingPayload, S>

  type BoardEmbeddingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BoardEmbeddingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BoardEmbeddingCountAggregateInputType | true
    }

  export interface BoardEmbeddingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BoardEmbedding'], meta: { name: 'BoardEmbedding' } }
    /**
     * Find zero or one BoardEmbedding that matches the filter.
     * @param {BoardEmbeddingFindUniqueArgs} args - Arguments to find a BoardEmbedding
     * @example
     * // Get one BoardEmbedding
     * const boardEmbedding = await prisma.boardEmbedding.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BoardEmbeddingFindUniqueArgs>(args: SelectSubset<T, BoardEmbeddingFindUniqueArgs<ExtArgs>>): Prisma__BoardEmbeddingClient<$Result.GetResult<Prisma.$BoardEmbeddingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one BoardEmbedding that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BoardEmbeddingFindUniqueOrThrowArgs} args - Arguments to find a BoardEmbedding
     * @example
     * // Get one BoardEmbedding
     * const boardEmbedding = await prisma.boardEmbedding.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BoardEmbeddingFindUniqueOrThrowArgs>(args: SelectSubset<T, BoardEmbeddingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BoardEmbeddingClient<$Result.GetResult<Prisma.$BoardEmbeddingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BoardEmbedding that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardEmbeddingFindFirstArgs} args - Arguments to find a BoardEmbedding
     * @example
     * // Get one BoardEmbedding
     * const boardEmbedding = await prisma.boardEmbedding.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BoardEmbeddingFindFirstArgs>(args?: SelectSubset<T, BoardEmbeddingFindFirstArgs<ExtArgs>>): Prisma__BoardEmbeddingClient<$Result.GetResult<Prisma.$BoardEmbeddingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BoardEmbedding that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardEmbeddingFindFirstOrThrowArgs} args - Arguments to find a BoardEmbedding
     * @example
     * // Get one BoardEmbedding
     * const boardEmbedding = await prisma.boardEmbedding.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BoardEmbeddingFindFirstOrThrowArgs>(args?: SelectSubset<T, BoardEmbeddingFindFirstOrThrowArgs<ExtArgs>>): Prisma__BoardEmbeddingClient<$Result.GetResult<Prisma.$BoardEmbeddingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more BoardEmbeddings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardEmbeddingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BoardEmbeddings
     * const boardEmbeddings = await prisma.boardEmbedding.findMany()
     * 
     * // Get first 10 BoardEmbeddings
     * const boardEmbeddings = await prisma.boardEmbedding.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const boardEmbeddingWithIdOnly = await prisma.boardEmbedding.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BoardEmbeddingFindManyArgs>(args?: SelectSubset<T, BoardEmbeddingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BoardEmbeddingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Delete a BoardEmbedding.
     * @param {BoardEmbeddingDeleteArgs} args - Arguments to delete one BoardEmbedding.
     * @example
     * // Delete one BoardEmbedding
     * const BoardEmbedding = await prisma.boardEmbedding.delete({
     *   where: {
     *     // ... filter to delete one BoardEmbedding
     *   }
     * })
     * 
     */
    delete<T extends BoardEmbeddingDeleteArgs>(args: SelectSubset<T, BoardEmbeddingDeleteArgs<ExtArgs>>): Prisma__BoardEmbeddingClient<$Result.GetResult<Prisma.$BoardEmbeddingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one BoardEmbedding.
     * @param {BoardEmbeddingUpdateArgs} args - Arguments to update one BoardEmbedding.
     * @example
     * // Update one BoardEmbedding
     * const boardEmbedding = await prisma.boardEmbedding.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BoardEmbeddingUpdateArgs>(args: SelectSubset<T, BoardEmbeddingUpdateArgs<ExtArgs>>): Prisma__BoardEmbeddingClient<$Result.GetResult<Prisma.$BoardEmbeddingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more BoardEmbeddings.
     * @param {BoardEmbeddingDeleteManyArgs} args - Arguments to filter BoardEmbeddings to delete.
     * @example
     * // Delete a few BoardEmbeddings
     * const { count } = await prisma.boardEmbedding.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BoardEmbeddingDeleteManyArgs>(args?: SelectSubset<T, BoardEmbeddingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BoardEmbeddings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardEmbeddingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BoardEmbeddings
     * const boardEmbedding = await prisma.boardEmbedding.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BoardEmbeddingUpdateManyArgs>(args: SelectSubset<T, BoardEmbeddingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BoardEmbeddings and returns the data updated in the database.
     * @param {BoardEmbeddingUpdateManyAndReturnArgs} args - Arguments to update many BoardEmbeddings.
     * @example
     * // Update many BoardEmbeddings
     * const boardEmbedding = await prisma.boardEmbedding.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more BoardEmbeddings and only return the `id`
     * const boardEmbeddingWithIdOnly = await prisma.boardEmbedding.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BoardEmbeddingUpdateManyAndReturnArgs>(args: SelectSubset<T, BoardEmbeddingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BoardEmbeddingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>


    /**
     * Count the number of BoardEmbeddings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardEmbeddingCountArgs} args - Arguments to filter BoardEmbeddings to count.
     * @example
     * // Count the number of BoardEmbeddings
     * const count = await prisma.boardEmbedding.count({
     *   where: {
     *     // ... the filter for the BoardEmbeddings we want to count
     *   }
     * })
    **/
    count<T extends BoardEmbeddingCountArgs>(
      args?: Subset<T, BoardEmbeddingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BoardEmbeddingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a BoardEmbedding.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardEmbeddingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BoardEmbeddingAggregateArgs>(args: Subset<T, BoardEmbeddingAggregateArgs>): Prisma.PrismaPromise<GetBoardEmbeddingAggregateType<T>>

    /**
     * Group by BoardEmbedding.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BoardEmbeddingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BoardEmbeddingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BoardEmbeddingGroupByArgs['orderBy'] }
        : { orderBy?: BoardEmbeddingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BoardEmbeddingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBoardEmbeddingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the BoardEmbedding model
   */
  readonly fields: BoardEmbeddingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for BoardEmbedding.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BoardEmbeddingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    board<T extends BoardDefaultArgs<ExtArgs> = {}>(args?: Subset<T, BoardDefaultArgs<ExtArgs>>): Prisma__BoardClient<$Result.GetResult<Prisma.$BoardPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the BoardEmbedding model
   */
  interface BoardEmbeddingFieldRefs {
    readonly id: FieldRef<"BoardEmbedding", 'String'>
    readonly boardId: FieldRef<"BoardEmbedding", 'String'>
    readonly content: FieldRef<"BoardEmbedding", 'String'>
    readonly metadata: FieldRef<"BoardEmbedding", 'Json'>
    readonly createdAt: FieldRef<"BoardEmbedding", 'DateTime'>
    readonly updatedAt: FieldRef<"BoardEmbedding", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * BoardEmbedding findUnique
   */
  export type BoardEmbeddingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardEmbedding
     */
    select?: BoardEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardEmbedding
     */
    omit?: BoardEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardEmbeddingInclude<ExtArgs> | null
    /**
     * Filter, which BoardEmbedding to fetch.
     */
    where: BoardEmbeddingWhereUniqueInput
  }

  /**
   * BoardEmbedding findUniqueOrThrow
   */
  export type BoardEmbeddingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardEmbedding
     */
    select?: BoardEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardEmbedding
     */
    omit?: BoardEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardEmbeddingInclude<ExtArgs> | null
    /**
     * Filter, which BoardEmbedding to fetch.
     */
    where: BoardEmbeddingWhereUniqueInput
  }

  /**
   * BoardEmbedding findFirst
   */
  export type BoardEmbeddingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardEmbedding
     */
    select?: BoardEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardEmbedding
     */
    omit?: BoardEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardEmbeddingInclude<ExtArgs> | null
    /**
     * Filter, which BoardEmbedding to fetch.
     */
    where?: BoardEmbeddingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BoardEmbeddings to fetch.
     */
    orderBy?: BoardEmbeddingOrderByWithRelationInput | BoardEmbeddingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BoardEmbeddings.
     */
    cursor?: BoardEmbeddingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BoardEmbeddings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BoardEmbeddings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BoardEmbeddings.
     */
    distinct?: BoardEmbeddingScalarFieldEnum | BoardEmbeddingScalarFieldEnum[]
  }

  /**
   * BoardEmbedding findFirstOrThrow
   */
  export type BoardEmbeddingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardEmbedding
     */
    select?: BoardEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardEmbedding
     */
    omit?: BoardEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardEmbeddingInclude<ExtArgs> | null
    /**
     * Filter, which BoardEmbedding to fetch.
     */
    where?: BoardEmbeddingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BoardEmbeddings to fetch.
     */
    orderBy?: BoardEmbeddingOrderByWithRelationInput | BoardEmbeddingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BoardEmbeddings.
     */
    cursor?: BoardEmbeddingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BoardEmbeddings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BoardEmbeddings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BoardEmbeddings.
     */
    distinct?: BoardEmbeddingScalarFieldEnum | BoardEmbeddingScalarFieldEnum[]
  }

  /**
   * BoardEmbedding findMany
   */
  export type BoardEmbeddingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardEmbedding
     */
    select?: BoardEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardEmbedding
     */
    omit?: BoardEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardEmbeddingInclude<ExtArgs> | null
    /**
     * Filter, which BoardEmbeddings to fetch.
     */
    where?: BoardEmbeddingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BoardEmbeddings to fetch.
     */
    orderBy?: BoardEmbeddingOrderByWithRelationInput | BoardEmbeddingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing BoardEmbeddings.
     */
    cursor?: BoardEmbeddingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BoardEmbeddings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BoardEmbeddings.
     */
    skip?: number
    distinct?: BoardEmbeddingScalarFieldEnum | BoardEmbeddingScalarFieldEnum[]
  }

  /**
   * BoardEmbedding update
   */
  export type BoardEmbeddingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardEmbedding
     */
    select?: BoardEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardEmbedding
     */
    omit?: BoardEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardEmbeddingInclude<ExtArgs> | null
    /**
     * The data needed to update a BoardEmbedding.
     */
    data: XOR<BoardEmbeddingUpdateInput, BoardEmbeddingUncheckedUpdateInput>
    /**
     * Choose, which BoardEmbedding to update.
     */
    where: BoardEmbeddingWhereUniqueInput
  }

  /**
   * BoardEmbedding updateMany
   */
  export type BoardEmbeddingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update BoardEmbeddings.
     */
    data: XOR<BoardEmbeddingUpdateManyMutationInput, BoardEmbeddingUncheckedUpdateManyInput>
    /**
     * Filter which BoardEmbeddings to update
     */
    where?: BoardEmbeddingWhereInput
    /**
     * Limit how many BoardEmbeddings to update.
     */
    limit?: number
  }

  /**
   * BoardEmbedding updateManyAndReturn
   */
  export type BoardEmbeddingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardEmbedding
     */
    select?: BoardEmbeddingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BoardEmbedding
     */
    omit?: BoardEmbeddingOmit<ExtArgs> | null
    /**
     * The data used to update BoardEmbeddings.
     */
    data: XOR<BoardEmbeddingUpdateManyMutationInput, BoardEmbeddingUncheckedUpdateManyInput>
    /**
     * Filter which BoardEmbeddings to update
     */
    where?: BoardEmbeddingWhereInput
    /**
     * Limit how many BoardEmbeddings to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardEmbeddingIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * BoardEmbedding delete
   */
  export type BoardEmbeddingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardEmbedding
     */
    select?: BoardEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardEmbedding
     */
    omit?: BoardEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardEmbeddingInclude<ExtArgs> | null
    /**
     * Filter which BoardEmbedding to delete.
     */
    where: BoardEmbeddingWhereUniqueInput
  }

  /**
   * BoardEmbedding deleteMany
   */
  export type BoardEmbeddingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BoardEmbeddings to delete
     */
    where?: BoardEmbeddingWhereInput
    /**
     * Limit how many BoardEmbeddings to delete.
     */
    limit?: number
  }

  /**
   * BoardEmbedding without action
   */
  export type BoardEmbeddingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BoardEmbedding
     */
    select?: BoardEmbeddingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BoardEmbedding
     */
    omit?: BoardEmbeddingOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BoardEmbeddingInclude<ExtArgs> | null
  }


  /**
   * Model AIConversation
   */

  export type AggregateAIConversation = {
    _count: AIConversationCountAggregateOutputType | null
    _min: AIConversationMinAggregateOutputType | null
    _max: AIConversationMaxAggregateOutputType | null
  }

  export type AIConversationMinAggregateOutputType = {
    id: string | null
    userId: string | null
    companyId: string | null
    title: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AIConversationMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    companyId: string | null
    title: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AIConversationCountAggregateOutputType = {
    id: number
    userId: number
    companyId: number
    title: number
    context: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AIConversationMinAggregateInputType = {
    id?: true
    userId?: true
    companyId?: true
    title?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AIConversationMaxAggregateInputType = {
    id?: true
    userId?: true
    companyId?: true
    title?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AIConversationCountAggregateInputType = {
    id?: true
    userId?: true
    companyId?: true
    title?: true
    context?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AIConversationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AIConversation to aggregate.
     */
    where?: AIConversationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIConversations to fetch.
     */
    orderBy?: AIConversationOrderByWithRelationInput | AIConversationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AIConversationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIConversations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIConversations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AIConversations
    **/
    _count?: true | AIConversationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AIConversationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AIConversationMaxAggregateInputType
  }

  export type GetAIConversationAggregateType<T extends AIConversationAggregateArgs> = {
        [P in keyof T & keyof AggregateAIConversation]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAIConversation[P]>
      : GetScalarType<T[P], AggregateAIConversation[P]>
  }




  export type AIConversationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AIConversationWhereInput
    orderBy?: AIConversationOrderByWithAggregationInput | AIConversationOrderByWithAggregationInput[]
    by: AIConversationScalarFieldEnum[] | AIConversationScalarFieldEnum
    having?: AIConversationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AIConversationCountAggregateInputType | true
    _min?: AIConversationMinAggregateInputType
    _max?: AIConversationMaxAggregateInputType
  }

  export type AIConversationGroupByOutputType = {
    id: string
    userId: string
    companyId: string
    title: string | null
    context: JsonValue | null
    createdAt: Date
    updatedAt: Date
    _count: AIConversationCountAggregateOutputType | null
    _min: AIConversationMinAggregateOutputType | null
    _max: AIConversationMaxAggregateOutputType | null
  }

  type GetAIConversationGroupByPayload<T extends AIConversationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AIConversationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AIConversationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AIConversationGroupByOutputType[P]>
            : GetScalarType<T[P], AIConversationGroupByOutputType[P]>
        }
      >
    >


  export type AIConversationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    companyId?: boolean
    title?: boolean
    context?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    messages?: boolean | AIConversation$messagesArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | AIConversationCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aIConversation"]>

  export type AIConversationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    companyId?: boolean
    title?: boolean
    context?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aIConversation"]>

  export type AIConversationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    companyId?: boolean
    title?: boolean
    context?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aIConversation"]>

  export type AIConversationSelectScalar = {
    id?: boolean
    userId?: boolean
    companyId?: boolean
    title?: boolean
    context?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AIConversationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "companyId" | "title" | "context" | "createdAt" | "updatedAt", ExtArgs["result"]["aIConversation"]>
  export type AIConversationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    messages?: boolean | AIConversation$messagesArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | AIConversationCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AIConversationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AIConversationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AIConversationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AIConversation"
    objects: {
      messages: Prisma.$AIMessagePayload<ExtArgs>[]
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      companyId: string
      title: string | null
      context: Prisma.JsonValue | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["aIConversation"]>
    composites: {}
  }

  type AIConversationGetPayload<S extends boolean | null | undefined | AIConversationDefaultArgs> = $Result.GetResult<Prisma.$AIConversationPayload, S>

  type AIConversationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AIConversationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AIConversationCountAggregateInputType | true
    }

  export interface AIConversationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AIConversation'], meta: { name: 'AIConversation' } }
    /**
     * Find zero or one AIConversation that matches the filter.
     * @param {AIConversationFindUniqueArgs} args - Arguments to find a AIConversation
     * @example
     * // Get one AIConversation
     * const aIConversation = await prisma.aIConversation.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AIConversationFindUniqueArgs>(args: SelectSubset<T, AIConversationFindUniqueArgs<ExtArgs>>): Prisma__AIConversationClient<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AIConversation that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AIConversationFindUniqueOrThrowArgs} args - Arguments to find a AIConversation
     * @example
     * // Get one AIConversation
     * const aIConversation = await prisma.aIConversation.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AIConversationFindUniqueOrThrowArgs>(args: SelectSubset<T, AIConversationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AIConversationClient<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AIConversation that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIConversationFindFirstArgs} args - Arguments to find a AIConversation
     * @example
     * // Get one AIConversation
     * const aIConversation = await prisma.aIConversation.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AIConversationFindFirstArgs>(args?: SelectSubset<T, AIConversationFindFirstArgs<ExtArgs>>): Prisma__AIConversationClient<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AIConversation that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIConversationFindFirstOrThrowArgs} args - Arguments to find a AIConversation
     * @example
     * // Get one AIConversation
     * const aIConversation = await prisma.aIConversation.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AIConversationFindFirstOrThrowArgs>(args?: SelectSubset<T, AIConversationFindFirstOrThrowArgs<ExtArgs>>): Prisma__AIConversationClient<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AIConversations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIConversationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AIConversations
     * const aIConversations = await prisma.aIConversation.findMany()
     * 
     * // Get first 10 AIConversations
     * const aIConversations = await prisma.aIConversation.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aIConversationWithIdOnly = await prisma.aIConversation.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AIConversationFindManyArgs>(args?: SelectSubset<T, AIConversationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AIConversation.
     * @param {AIConversationCreateArgs} args - Arguments to create a AIConversation.
     * @example
     * // Create one AIConversation
     * const AIConversation = await prisma.aIConversation.create({
     *   data: {
     *     // ... data to create a AIConversation
     *   }
     * })
     * 
     */
    create<T extends AIConversationCreateArgs>(args: SelectSubset<T, AIConversationCreateArgs<ExtArgs>>): Prisma__AIConversationClient<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AIConversations.
     * @param {AIConversationCreateManyArgs} args - Arguments to create many AIConversations.
     * @example
     * // Create many AIConversations
     * const aIConversation = await prisma.aIConversation.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AIConversationCreateManyArgs>(args?: SelectSubset<T, AIConversationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AIConversations and returns the data saved in the database.
     * @param {AIConversationCreateManyAndReturnArgs} args - Arguments to create many AIConversations.
     * @example
     * // Create many AIConversations
     * const aIConversation = await prisma.aIConversation.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AIConversations and only return the `id`
     * const aIConversationWithIdOnly = await prisma.aIConversation.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AIConversationCreateManyAndReturnArgs>(args?: SelectSubset<T, AIConversationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AIConversation.
     * @param {AIConversationDeleteArgs} args - Arguments to delete one AIConversation.
     * @example
     * // Delete one AIConversation
     * const AIConversation = await prisma.aIConversation.delete({
     *   where: {
     *     // ... filter to delete one AIConversation
     *   }
     * })
     * 
     */
    delete<T extends AIConversationDeleteArgs>(args: SelectSubset<T, AIConversationDeleteArgs<ExtArgs>>): Prisma__AIConversationClient<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AIConversation.
     * @param {AIConversationUpdateArgs} args - Arguments to update one AIConversation.
     * @example
     * // Update one AIConversation
     * const aIConversation = await prisma.aIConversation.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AIConversationUpdateArgs>(args: SelectSubset<T, AIConversationUpdateArgs<ExtArgs>>): Prisma__AIConversationClient<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AIConversations.
     * @param {AIConversationDeleteManyArgs} args - Arguments to filter AIConversations to delete.
     * @example
     * // Delete a few AIConversations
     * const { count } = await prisma.aIConversation.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AIConversationDeleteManyArgs>(args?: SelectSubset<T, AIConversationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AIConversations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIConversationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AIConversations
     * const aIConversation = await prisma.aIConversation.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AIConversationUpdateManyArgs>(args: SelectSubset<T, AIConversationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AIConversations and returns the data updated in the database.
     * @param {AIConversationUpdateManyAndReturnArgs} args - Arguments to update many AIConversations.
     * @example
     * // Update many AIConversations
     * const aIConversation = await prisma.aIConversation.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AIConversations and only return the `id`
     * const aIConversationWithIdOnly = await prisma.aIConversation.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AIConversationUpdateManyAndReturnArgs>(args: SelectSubset<T, AIConversationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AIConversation.
     * @param {AIConversationUpsertArgs} args - Arguments to update or create a AIConversation.
     * @example
     * // Update or create a AIConversation
     * const aIConversation = await prisma.aIConversation.upsert({
     *   create: {
     *     // ... data to create a AIConversation
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AIConversation we want to update
     *   }
     * })
     */
    upsert<T extends AIConversationUpsertArgs>(args: SelectSubset<T, AIConversationUpsertArgs<ExtArgs>>): Prisma__AIConversationClient<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AIConversations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIConversationCountArgs} args - Arguments to filter AIConversations to count.
     * @example
     * // Count the number of AIConversations
     * const count = await prisma.aIConversation.count({
     *   where: {
     *     // ... the filter for the AIConversations we want to count
     *   }
     * })
    **/
    count<T extends AIConversationCountArgs>(
      args?: Subset<T, AIConversationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AIConversationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AIConversation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIConversationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AIConversationAggregateArgs>(args: Subset<T, AIConversationAggregateArgs>): Prisma.PrismaPromise<GetAIConversationAggregateType<T>>

    /**
     * Group by AIConversation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIConversationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AIConversationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AIConversationGroupByArgs['orderBy'] }
        : { orderBy?: AIConversationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AIConversationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAIConversationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AIConversation model
   */
  readonly fields: AIConversationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AIConversation.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AIConversationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    messages<T extends AIConversation$messagesArgs<ExtArgs> = {}>(args?: Subset<T, AIConversation$messagesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AIConversation model
   */
  interface AIConversationFieldRefs {
    readonly id: FieldRef<"AIConversation", 'String'>
    readonly userId: FieldRef<"AIConversation", 'String'>
    readonly companyId: FieldRef<"AIConversation", 'String'>
    readonly title: FieldRef<"AIConversation", 'String'>
    readonly context: FieldRef<"AIConversation", 'Json'>
    readonly createdAt: FieldRef<"AIConversation", 'DateTime'>
    readonly updatedAt: FieldRef<"AIConversation", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AIConversation findUnique
   */
  export type AIConversationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationInclude<ExtArgs> | null
    /**
     * Filter, which AIConversation to fetch.
     */
    where: AIConversationWhereUniqueInput
  }

  /**
   * AIConversation findUniqueOrThrow
   */
  export type AIConversationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationInclude<ExtArgs> | null
    /**
     * Filter, which AIConversation to fetch.
     */
    where: AIConversationWhereUniqueInput
  }

  /**
   * AIConversation findFirst
   */
  export type AIConversationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationInclude<ExtArgs> | null
    /**
     * Filter, which AIConversation to fetch.
     */
    where?: AIConversationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIConversations to fetch.
     */
    orderBy?: AIConversationOrderByWithRelationInput | AIConversationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AIConversations.
     */
    cursor?: AIConversationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIConversations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIConversations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AIConversations.
     */
    distinct?: AIConversationScalarFieldEnum | AIConversationScalarFieldEnum[]
  }

  /**
   * AIConversation findFirstOrThrow
   */
  export type AIConversationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationInclude<ExtArgs> | null
    /**
     * Filter, which AIConversation to fetch.
     */
    where?: AIConversationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIConversations to fetch.
     */
    orderBy?: AIConversationOrderByWithRelationInput | AIConversationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AIConversations.
     */
    cursor?: AIConversationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIConversations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIConversations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AIConversations.
     */
    distinct?: AIConversationScalarFieldEnum | AIConversationScalarFieldEnum[]
  }

  /**
   * AIConversation findMany
   */
  export type AIConversationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationInclude<ExtArgs> | null
    /**
     * Filter, which AIConversations to fetch.
     */
    where?: AIConversationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIConversations to fetch.
     */
    orderBy?: AIConversationOrderByWithRelationInput | AIConversationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AIConversations.
     */
    cursor?: AIConversationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIConversations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIConversations.
     */
    skip?: number
    distinct?: AIConversationScalarFieldEnum | AIConversationScalarFieldEnum[]
  }

  /**
   * AIConversation create
   */
  export type AIConversationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationInclude<ExtArgs> | null
    /**
     * The data needed to create a AIConversation.
     */
    data: XOR<AIConversationCreateInput, AIConversationUncheckedCreateInput>
  }

  /**
   * AIConversation createMany
   */
  export type AIConversationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AIConversations.
     */
    data: AIConversationCreateManyInput | AIConversationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AIConversation createManyAndReturn
   */
  export type AIConversationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * The data used to create many AIConversations.
     */
    data: AIConversationCreateManyInput | AIConversationCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AIConversation update
   */
  export type AIConversationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationInclude<ExtArgs> | null
    /**
     * The data needed to update a AIConversation.
     */
    data: XOR<AIConversationUpdateInput, AIConversationUncheckedUpdateInput>
    /**
     * Choose, which AIConversation to update.
     */
    where: AIConversationWhereUniqueInput
  }

  /**
   * AIConversation updateMany
   */
  export type AIConversationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AIConversations.
     */
    data: XOR<AIConversationUpdateManyMutationInput, AIConversationUncheckedUpdateManyInput>
    /**
     * Filter which AIConversations to update
     */
    where?: AIConversationWhereInput
    /**
     * Limit how many AIConversations to update.
     */
    limit?: number
  }

  /**
   * AIConversation updateManyAndReturn
   */
  export type AIConversationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * The data used to update AIConversations.
     */
    data: XOR<AIConversationUpdateManyMutationInput, AIConversationUncheckedUpdateManyInput>
    /**
     * Filter which AIConversations to update
     */
    where?: AIConversationWhereInput
    /**
     * Limit how many AIConversations to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AIConversation upsert
   */
  export type AIConversationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationInclude<ExtArgs> | null
    /**
     * The filter to search for the AIConversation to update in case it exists.
     */
    where: AIConversationWhereUniqueInput
    /**
     * In case the AIConversation found by the `where` argument doesn't exist, create a new AIConversation with this data.
     */
    create: XOR<AIConversationCreateInput, AIConversationUncheckedCreateInput>
    /**
     * In case the AIConversation was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AIConversationUpdateInput, AIConversationUncheckedUpdateInput>
  }

  /**
   * AIConversation delete
   */
  export type AIConversationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationInclude<ExtArgs> | null
    /**
     * Filter which AIConversation to delete.
     */
    where: AIConversationWhereUniqueInput
  }

  /**
   * AIConversation deleteMany
   */
  export type AIConversationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AIConversations to delete
     */
    where?: AIConversationWhereInput
    /**
     * Limit how many AIConversations to delete.
     */
    limit?: number
  }

  /**
   * AIConversation.messages
   */
  export type AIConversation$messagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageInclude<ExtArgs> | null
    where?: AIMessageWhereInput
    orderBy?: AIMessageOrderByWithRelationInput | AIMessageOrderByWithRelationInput[]
    cursor?: AIMessageWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AIMessageScalarFieldEnum | AIMessageScalarFieldEnum[]
  }

  /**
   * AIConversation without action
   */
  export type AIConversationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIConversation
     */
    select?: AIConversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIConversation
     */
    omit?: AIConversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIConversationInclude<ExtArgs> | null
  }


  /**
   * Model AIMessage
   */

  export type AggregateAIMessage = {
    _count: AIMessageCountAggregateOutputType | null
    _min: AIMessageMinAggregateOutputType | null
    _max: AIMessageMaxAggregateOutputType | null
  }

  export type AIMessageMinAggregateOutputType = {
    id: string | null
    conversationId: string | null
    role: string | null
    content: string | null
    createdAt: Date | null
  }

  export type AIMessageMaxAggregateOutputType = {
    id: string | null
    conversationId: string | null
    role: string | null
    content: string | null
    createdAt: Date | null
  }

  export type AIMessageCountAggregateOutputType = {
    id: number
    conversationId: number
    role: number
    content: number
    metadata: number
    createdAt: number
    _all: number
  }


  export type AIMessageMinAggregateInputType = {
    id?: true
    conversationId?: true
    role?: true
    content?: true
    createdAt?: true
  }

  export type AIMessageMaxAggregateInputType = {
    id?: true
    conversationId?: true
    role?: true
    content?: true
    createdAt?: true
  }

  export type AIMessageCountAggregateInputType = {
    id?: true
    conversationId?: true
    role?: true
    content?: true
    metadata?: true
    createdAt?: true
    _all?: true
  }

  export type AIMessageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AIMessage to aggregate.
     */
    where?: AIMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIMessages to fetch.
     */
    orderBy?: AIMessageOrderByWithRelationInput | AIMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AIMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AIMessages
    **/
    _count?: true | AIMessageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AIMessageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AIMessageMaxAggregateInputType
  }

  export type GetAIMessageAggregateType<T extends AIMessageAggregateArgs> = {
        [P in keyof T & keyof AggregateAIMessage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAIMessage[P]>
      : GetScalarType<T[P], AggregateAIMessage[P]>
  }




  export type AIMessageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AIMessageWhereInput
    orderBy?: AIMessageOrderByWithAggregationInput | AIMessageOrderByWithAggregationInput[]
    by: AIMessageScalarFieldEnum[] | AIMessageScalarFieldEnum
    having?: AIMessageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AIMessageCountAggregateInputType | true
    _min?: AIMessageMinAggregateInputType
    _max?: AIMessageMaxAggregateInputType
  }

  export type AIMessageGroupByOutputType = {
    id: string
    conversationId: string
    role: string
    content: string
    metadata: JsonValue | null
    createdAt: Date
    _count: AIMessageCountAggregateOutputType | null
    _min: AIMessageMinAggregateOutputType | null
    _max: AIMessageMaxAggregateOutputType | null
  }

  type GetAIMessageGroupByPayload<T extends AIMessageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AIMessageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AIMessageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AIMessageGroupByOutputType[P]>
            : GetScalarType<T[P], AIMessageGroupByOutputType[P]>
        }
      >
    >


  export type AIMessageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    conversationId?: boolean
    role?: boolean
    content?: boolean
    metadata?: boolean
    createdAt?: boolean
    conversation?: boolean | AIConversationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aIMessage"]>

  export type AIMessageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    conversationId?: boolean
    role?: boolean
    content?: boolean
    metadata?: boolean
    createdAt?: boolean
    conversation?: boolean | AIConversationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aIMessage"]>

  export type AIMessageSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    conversationId?: boolean
    role?: boolean
    content?: boolean
    metadata?: boolean
    createdAt?: boolean
    conversation?: boolean | AIConversationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["aIMessage"]>

  export type AIMessageSelectScalar = {
    id?: boolean
    conversationId?: boolean
    role?: boolean
    content?: boolean
    metadata?: boolean
    createdAt?: boolean
  }

  export type AIMessageOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "conversationId" | "role" | "content" | "metadata" | "createdAt", ExtArgs["result"]["aIMessage"]>
  export type AIMessageInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    conversation?: boolean | AIConversationDefaultArgs<ExtArgs>
  }
  export type AIMessageIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    conversation?: boolean | AIConversationDefaultArgs<ExtArgs>
  }
  export type AIMessageIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    conversation?: boolean | AIConversationDefaultArgs<ExtArgs>
  }

  export type $AIMessagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AIMessage"
    objects: {
      conversation: Prisma.$AIConversationPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      conversationId: string
      role: string
      content: string
      metadata: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["aIMessage"]>
    composites: {}
  }

  type AIMessageGetPayload<S extends boolean | null | undefined | AIMessageDefaultArgs> = $Result.GetResult<Prisma.$AIMessagePayload, S>

  type AIMessageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AIMessageFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AIMessageCountAggregateInputType | true
    }

  export interface AIMessageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AIMessage'], meta: { name: 'AIMessage' } }
    /**
     * Find zero or one AIMessage that matches the filter.
     * @param {AIMessageFindUniqueArgs} args - Arguments to find a AIMessage
     * @example
     * // Get one AIMessage
     * const aIMessage = await prisma.aIMessage.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AIMessageFindUniqueArgs>(args: SelectSubset<T, AIMessageFindUniqueArgs<ExtArgs>>): Prisma__AIMessageClient<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AIMessage that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AIMessageFindUniqueOrThrowArgs} args - Arguments to find a AIMessage
     * @example
     * // Get one AIMessage
     * const aIMessage = await prisma.aIMessage.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AIMessageFindUniqueOrThrowArgs>(args: SelectSubset<T, AIMessageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AIMessageClient<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AIMessage that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIMessageFindFirstArgs} args - Arguments to find a AIMessage
     * @example
     * // Get one AIMessage
     * const aIMessage = await prisma.aIMessage.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AIMessageFindFirstArgs>(args?: SelectSubset<T, AIMessageFindFirstArgs<ExtArgs>>): Prisma__AIMessageClient<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AIMessage that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIMessageFindFirstOrThrowArgs} args - Arguments to find a AIMessage
     * @example
     * // Get one AIMessage
     * const aIMessage = await prisma.aIMessage.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AIMessageFindFirstOrThrowArgs>(args?: SelectSubset<T, AIMessageFindFirstOrThrowArgs<ExtArgs>>): Prisma__AIMessageClient<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AIMessages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIMessageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AIMessages
     * const aIMessages = await prisma.aIMessage.findMany()
     * 
     * // Get first 10 AIMessages
     * const aIMessages = await prisma.aIMessage.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aIMessageWithIdOnly = await prisma.aIMessage.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AIMessageFindManyArgs>(args?: SelectSubset<T, AIMessageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AIMessage.
     * @param {AIMessageCreateArgs} args - Arguments to create a AIMessage.
     * @example
     * // Create one AIMessage
     * const AIMessage = await prisma.aIMessage.create({
     *   data: {
     *     // ... data to create a AIMessage
     *   }
     * })
     * 
     */
    create<T extends AIMessageCreateArgs>(args: SelectSubset<T, AIMessageCreateArgs<ExtArgs>>): Prisma__AIMessageClient<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AIMessages.
     * @param {AIMessageCreateManyArgs} args - Arguments to create many AIMessages.
     * @example
     * // Create many AIMessages
     * const aIMessage = await prisma.aIMessage.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AIMessageCreateManyArgs>(args?: SelectSubset<T, AIMessageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AIMessages and returns the data saved in the database.
     * @param {AIMessageCreateManyAndReturnArgs} args - Arguments to create many AIMessages.
     * @example
     * // Create many AIMessages
     * const aIMessage = await prisma.aIMessage.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AIMessages and only return the `id`
     * const aIMessageWithIdOnly = await prisma.aIMessage.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AIMessageCreateManyAndReturnArgs>(args?: SelectSubset<T, AIMessageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AIMessage.
     * @param {AIMessageDeleteArgs} args - Arguments to delete one AIMessage.
     * @example
     * // Delete one AIMessage
     * const AIMessage = await prisma.aIMessage.delete({
     *   where: {
     *     // ... filter to delete one AIMessage
     *   }
     * })
     * 
     */
    delete<T extends AIMessageDeleteArgs>(args: SelectSubset<T, AIMessageDeleteArgs<ExtArgs>>): Prisma__AIMessageClient<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AIMessage.
     * @param {AIMessageUpdateArgs} args - Arguments to update one AIMessage.
     * @example
     * // Update one AIMessage
     * const aIMessage = await prisma.aIMessage.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AIMessageUpdateArgs>(args: SelectSubset<T, AIMessageUpdateArgs<ExtArgs>>): Prisma__AIMessageClient<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AIMessages.
     * @param {AIMessageDeleteManyArgs} args - Arguments to filter AIMessages to delete.
     * @example
     * // Delete a few AIMessages
     * const { count } = await prisma.aIMessage.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AIMessageDeleteManyArgs>(args?: SelectSubset<T, AIMessageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AIMessages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIMessageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AIMessages
     * const aIMessage = await prisma.aIMessage.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AIMessageUpdateManyArgs>(args: SelectSubset<T, AIMessageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AIMessages and returns the data updated in the database.
     * @param {AIMessageUpdateManyAndReturnArgs} args - Arguments to update many AIMessages.
     * @example
     * // Update many AIMessages
     * const aIMessage = await prisma.aIMessage.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AIMessages and only return the `id`
     * const aIMessageWithIdOnly = await prisma.aIMessage.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AIMessageUpdateManyAndReturnArgs>(args: SelectSubset<T, AIMessageUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AIMessage.
     * @param {AIMessageUpsertArgs} args - Arguments to update or create a AIMessage.
     * @example
     * // Update or create a AIMessage
     * const aIMessage = await prisma.aIMessage.upsert({
     *   create: {
     *     // ... data to create a AIMessage
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AIMessage we want to update
     *   }
     * })
     */
    upsert<T extends AIMessageUpsertArgs>(args: SelectSubset<T, AIMessageUpsertArgs<ExtArgs>>): Prisma__AIMessageClient<$Result.GetResult<Prisma.$AIMessagePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AIMessages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIMessageCountArgs} args - Arguments to filter AIMessages to count.
     * @example
     * // Count the number of AIMessages
     * const count = await prisma.aIMessage.count({
     *   where: {
     *     // ... the filter for the AIMessages we want to count
     *   }
     * })
    **/
    count<T extends AIMessageCountArgs>(
      args?: Subset<T, AIMessageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AIMessageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AIMessage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIMessageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AIMessageAggregateArgs>(args: Subset<T, AIMessageAggregateArgs>): Prisma.PrismaPromise<GetAIMessageAggregateType<T>>

    /**
     * Group by AIMessage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIMessageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AIMessageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AIMessageGroupByArgs['orderBy'] }
        : { orderBy?: AIMessageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AIMessageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAIMessageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AIMessage model
   */
  readonly fields: AIMessageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AIMessage.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AIMessageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    conversation<T extends AIConversationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AIConversationDefaultArgs<ExtArgs>>): Prisma__AIConversationClient<$Result.GetResult<Prisma.$AIConversationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AIMessage model
   */
  interface AIMessageFieldRefs {
    readonly id: FieldRef<"AIMessage", 'String'>
    readonly conversationId: FieldRef<"AIMessage", 'String'>
    readonly role: FieldRef<"AIMessage", 'String'>
    readonly content: FieldRef<"AIMessage", 'String'>
    readonly metadata: FieldRef<"AIMessage", 'Json'>
    readonly createdAt: FieldRef<"AIMessage", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AIMessage findUnique
   */
  export type AIMessageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageInclude<ExtArgs> | null
    /**
     * Filter, which AIMessage to fetch.
     */
    where: AIMessageWhereUniqueInput
  }

  /**
   * AIMessage findUniqueOrThrow
   */
  export type AIMessageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageInclude<ExtArgs> | null
    /**
     * Filter, which AIMessage to fetch.
     */
    where: AIMessageWhereUniqueInput
  }

  /**
   * AIMessage findFirst
   */
  export type AIMessageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageInclude<ExtArgs> | null
    /**
     * Filter, which AIMessage to fetch.
     */
    where?: AIMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIMessages to fetch.
     */
    orderBy?: AIMessageOrderByWithRelationInput | AIMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AIMessages.
     */
    cursor?: AIMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AIMessages.
     */
    distinct?: AIMessageScalarFieldEnum | AIMessageScalarFieldEnum[]
  }

  /**
   * AIMessage findFirstOrThrow
   */
  export type AIMessageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageInclude<ExtArgs> | null
    /**
     * Filter, which AIMessage to fetch.
     */
    where?: AIMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIMessages to fetch.
     */
    orderBy?: AIMessageOrderByWithRelationInput | AIMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AIMessages.
     */
    cursor?: AIMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AIMessages.
     */
    distinct?: AIMessageScalarFieldEnum | AIMessageScalarFieldEnum[]
  }

  /**
   * AIMessage findMany
   */
  export type AIMessageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageInclude<ExtArgs> | null
    /**
     * Filter, which AIMessages to fetch.
     */
    where?: AIMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIMessages to fetch.
     */
    orderBy?: AIMessageOrderByWithRelationInput | AIMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AIMessages.
     */
    cursor?: AIMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIMessages.
     */
    skip?: number
    distinct?: AIMessageScalarFieldEnum | AIMessageScalarFieldEnum[]
  }

  /**
   * AIMessage create
   */
  export type AIMessageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageInclude<ExtArgs> | null
    /**
     * The data needed to create a AIMessage.
     */
    data: XOR<AIMessageCreateInput, AIMessageUncheckedCreateInput>
  }

  /**
   * AIMessage createMany
   */
  export type AIMessageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AIMessages.
     */
    data: AIMessageCreateManyInput | AIMessageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AIMessage createManyAndReturn
   */
  export type AIMessageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * The data used to create many AIMessages.
     */
    data: AIMessageCreateManyInput | AIMessageCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AIMessage update
   */
  export type AIMessageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageInclude<ExtArgs> | null
    /**
     * The data needed to update a AIMessage.
     */
    data: XOR<AIMessageUpdateInput, AIMessageUncheckedUpdateInput>
    /**
     * Choose, which AIMessage to update.
     */
    where: AIMessageWhereUniqueInput
  }

  /**
   * AIMessage updateMany
   */
  export type AIMessageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AIMessages.
     */
    data: XOR<AIMessageUpdateManyMutationInput, AIMessageUncheckedUpdateManyInput>
    /**
     * Filter which AIMessages to update
     */
    where?: AIMessageWhereInput
    /**
     * Limit how many AIMessages to update.
     */
    limit?: number
  }

  /**
   * AIMessage updateManyAndReturn
   */
  export type AIMessageUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * The data used to update AIMessages.
     */
    data: XOR<AIMessageUpdateManyMutationInput, AIMessageUncheckedUpdateManyInput>
    /**
     * Filter which AIMessages to update
     */
    where?: AIMessageWhereInput
    /**
     * Limit how many AIMessages to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AIMessage upsert
   */
  export type AIMessageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageInclude<ExtArgs> | null
    /**
     * The filter to search for the AIMessage to update in case it exists.
     */
    where: AIMessageWhereUniqueInput
    /**
     * In case the AIMessage found by the `where` argument doesn't exist, create a new AIMessage with this data.
     */
    create: XOR<AIMessageCreateInput, AIMessageUncheckedCreateInput>
    /**
     * In case the AIMessage was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AIMessageUpdateInput, AIMessageUncheckedUpdateInput>
  }

  /**
   * AIMessage delete
   */
  export type AIMessageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageInclude<ExtArgs> | null
    /**
     * Filter which AIMessage to delete.
     */
    where: AIMessageWhereUniqueInput
  }

  /**
   * AIMessage deleteMany
   */
  export type AIMessageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AIMessages to delete
     */
    where?: AIMessageWhereInput
    /**
     * Limit how many AIMessages to delete.
     */
    limit?: number
  }

  /**
   * AIMessage without action
   */
  export type AIMessageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIMessage
     */
    select?: AIMessageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIMessage
     */
    omit?: AIMessageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIMessageInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const AccountScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    type: 'type',
    provider: 'provider',
    providerAccountId: 'providerAccountId',
    refresh_token: 'refresh_token',
    access_token: 'access_token',
    expires_at: 'expires_at',
    token_type: 'token_type',
    scope: 'scope',
    id_token: 'id_token',
    session_state: 'session_state'
  };

  export type AccountScalarFieldEnum = (typeof AccountScalarFieldEnum)[keyof typeof AccountScalarFieldEnum]


  export const SessionScalarFieldEnum: {
    id: 'id',
    sessionToken: 'sessionToken',
    userId: 'userId',
    expires: 'expires'
  };

  export type SessionScalarFieldEnum = (typeof SessionScalarFieldEnum)[keyof typeof SessionScalarFieldEnum]


  export const UserScalarFieldEnum: {
    id: 'id',
    name: 'name',
    email: 'email',
    emailVerified: 'emailVerified',
    emailVerificationToken: 'emailVerificationToken',
    emailTokenExpires: 'emailTokenExpires',
    image: 'image',
    password: 'password',
    cid: 'cid',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    role: 'role'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const VerificationTokenScalarFieldEnum: {
    identifier: 'identifier',
    token: 'token',
    expires: 'expires'
  };

  export type VerificationTokenScalarFieldEnum = (typeof VerificationTokenScalarFieldEnum)[keyof typeof VerificationTokenScalarFieldEnum]


  export const TaskScalarFieldEnum: {
    id: 'id',
    title: 'title',
    description: 'description',
    priority: 'priority',
    status: 'status',
    dueDate: 'dueDate',
    position: 'position',
    assignedToId: 'assignedToId',
    createdById: 'createdById',
    boardSectionId: 'boardSectionId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TaskScalarFieldEnum = (typeof TaskScalarFieldEnum)[keyof typeof TaskScalarFieldEnum]


  export const BoardScalarFieldEnum: {
    id: 'id',
    name: 'name',
    description: 'description',
    createdBy: 'createdBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    access: 'access'
  };

  export type BoardScalarFieldEnum = (typeof BoardScalarFieldEnum)[keyof typeof BoardScalarFieldEnum]


  export const BoardSectionScalarFieldEnum: {
    id: 'id',
    name: 'name',
    position: 'position',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    boardId: 'boardId'
  };

  export type BoardSectionScalarFieldEnum = (typeof BoardSectionScalarFieldEnum)[keyof typeof BoardSectionScalarFieldEnum]


  export const TaskHistoryScalarFieldEnum: {
    id: 'id',
    taskId: 'taskId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    description: 'description'
  };

  export type TaskHistoryScalarFieldEnum = (typeof TaskHistoryScalarFieldEnum)[keyof typeof TaskHistoryScalarFieldEnum]


  export const TaskEmbeddingScalarFieldEnum: {
    id: 'id',
    taskId: 'taskId',
    content: 'content',
    metadata: 'metadata',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TaskEmbeddingScalarFieldEnum = (typeof TaskEmbeddingScalarFieldEnum)[keyof typeof TaskEmbeddingScalarFieldEnum]


  export const BoardEmbeddingScalarFieldEnum: {
    id: 'id',
    boardId: 'boardId',
    content: 'content',
    metadata: 'metadata',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type BoardEmbeddingScalarFieldEnum = (typeof BoardEmbeddingScalarFieldEnum)[keyof typeof BoardEmbeddingScalarFieldEnum]


  export const AIConversationScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    companyId: 'companyId',
    title: 'title',
    context: 'context',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AIConversationScalarFieldEnum = (typeof AIConversationScalarFieldEnum)[keyof typeof AIConversationScalarFieldEnum]


  export const AIMessageScalarFieldEnum: {
    id: 'id',
    conversationId: 'conversationId',
    role: 'role',
    content: 'content',
    metadata: 'metadata',
    createdAt: 'createdAt'
  };

  export type AIMessageScalarFieldEnum = (typeof AIMessageScalarFieldEnum)[keyof typeof AIMessageScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'UserRole'
   */
  export type EnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole'>
    


  /**
   * Reference to a field of type 'UserRole[]'
   */
  export type ListEnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole[]'>
    


  /**
   * Reference to a field of type 'TaskPriority'
   */
  export type EnumTaskPriorityFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TaskPriority'>
    


  /**
   * Reference to a field of type 'TaskPriority[]'
   */
  export type ListEnumTaskPriorityFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TaskPriority[]'>
    


  /**
   * Reference to a field of type 'TaskStatusNew'
   */
  export type EnumTaskStatusNewFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TaskStatusNew'>
    


  /**
   * Reference to a field of type 'TaskStatusNew[]'
   */
  export type ListEnumTaskStatusNewFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TaskStatusNew[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type AccountWhereInput = {
    AND?: AccountWhereInput | AccountWhereInput[]
    OR?: AccountWhereInput[]
    NOT?: AccountWhereInput | AccountWhereInput[]
    id?: StringFilter<"Account"> | string
    userId?: StringFilter<"Account"> | string
    type?: StringFilter<"Account"> | string
    provider?: StringFilter<"Account"> | string
    providerAccountId?: StringFilter<"Account"> | string
    refresh_token?: StringNullableFilter<"Account"> | string | null
    access_token?: StringNullableFilter<"Account"> | string | null
    expires_at?: IntNullableFilter<"Account"> | number | null
    token_type?: StringNullableFilter<"Account"> | string | null
    scope?: StringNullableFilter<"Account"> | string | null
    id_token?: StringNullableFilter<"Account"> | string | null
    session_state?: StringNullableFilter<"Account"> | string | null
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type AccountOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    refresh_token?: SortOrderInput | SortOrder
    access_token?: SortOrderInput | SortOrder
    expires_at?: SortOrderInput | SortOrder
    token_type?: SortOrderInput | SortOrder
    scope?: SortOrderInput | SortOrder
    id_token?: SortOrderInput | SortOrder
    session_state?: SortOrderInput | SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type AccountWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    provider_providerAccountId?: AccountProviderProviderAccountIdCompoundUniqueInput
    AND?: AccountWhereInput | AccountWhereInput[]
    OR?: AccountWhereInput[]
    NOT?: AccountWhereInput | AccountWhereInput[]
    userId?: StringFilter<"Account"> | string
    type?: StringFilter<"Account"> | string
    provider?: StringFilter<"Account"> | string
    providerAccountId?: StringFilter<"Account"> | string
    refresh_token?: StringNullableFilter<"Account"> | string | null
    access_token?: StringNullableFilter<"Account"> | string | null
    expires_at?: IntNullableFilter<"Account"> | number | null
    token_type?: StringNullableFilter<"Account"> | string | null
    scope?: StringNullableFilter<"Account"> | string | null
    id_token?: StringNullableFilter<"Account"> | string | null
    session_state?: StringNullableFilter<"Account"> | string | null
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "provider_providerAccountId">

  export type AccountOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    refresh_token?: SortOrderInput | SortOrder
    access_token?: SortOrderInput | SortOrder
    expires_at?: SortOrderInput | SortOrder
    token_type?: SortOrderInput | SortOrder
    scope?: SortOrderInput | SortOrder
    id_token?: SortOrderInput | SortOrder
    session_state?: SortOrderInput | SortOrder
    _count?: AccountCountOrderByAggregateInput
    _avg?: AccountAvgOrderByAggregateInput
    _max?: AccountMaxOrderByAggregateInput
    _min?: AccountMinOrderByAggregateInput
    _sum?: AccountSumOrderByAggregateInput
  }

  export type AccountScalarWhereWithAggregatesInput = {
    AND?: AccountScalarWhereWithAggregatesInput | AccountScalarWhereWithAggregatesInput[]
    OR?: AccountScalarWhereWithAggregatesInput[]
    NOT?: AccountScalarWhereWithAggregatesInput | AccountScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Account"> | string
    userId?: StringWithAggregatesFilter<"Account"> | string
    type?: StringWithAggregatesFilter<"Account"> | string
    provider?: StringWithAggregatesFilter<"Account"> | string
    providerAccountId?: StringWithAggregatesFilter<"Account"> | string
    refresh_token?: StringNullableWithAggregatesFilter<"Account"> | string | null
    access_token?: StringNullableWithAggregatesFilter<"Account"> | string | null
    expires_at?: IntNullableWithAggregatesFilter<"Account"> | number | null
    token_type?: StringNullableWithAggregatesFilter<"Account"> | string | null
    scope?: StringNullableWithAggregatesFilter<"Account"> | string | null
    id_token?: StringNullableWithAggregatesFilter<"Account"> | string | null
    session_state?: StringNullableWithAggregatesFilter<"Account"> | string | null
  }

  export type SessionWhereInput = {
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    id?: StringFilter<"Session"> | string
    sessionToken?: StringFilter<"Session"> | string
    userId?: StringFilter<"Session"> | string
    expires?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type SessionOrderByWithRelationInput = {
    id?: SortOrder
    sessionToken?: SortOrder
    userId?: SortOrder
    expires?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type SessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    sessionToken?: string
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    userId?: StringFilter<"Session"> | string
    expires?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "sessionToken">

  export type SessionOrderByWithAggregationInput = {
    id?: SortOrder
    sessionToken?: SortOrder
    userId?: SortOrder
    expires?: SortOrder
    _count?: SessionCountOrderByAggregateInput
    _max?: SessionMaxOrderByAggregateInput
    _min?: SessionMinOrderByAggregateInput
  }

  export type SessionScalarWhereWithAggregatesInput = {
    AND?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    OR?: SessionScalarWhereWithAggregatesInput[]
    NOT?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Session"> | string
    sessionToken?: StringWithAggregatesFilter<"Session"> | string
    userId?: StringWithAggregatesFilter<"Session"> | string
    expires?: DateTimeWithAggregatesFilter<"Session"> | Date | string
  }

  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    name?: StringNullableFilter<"User"> | string | null
    email?: StringFilter<"User"> | string
    emailVerified?: DateTimeNullableFilter<"User"> | Date | string | null
    emailVerificationToken?: StringNullableFilter<"User"> | string | null
    emailTokenExpires?: DateTimeNullableFilter<"User"> | Date | string | null
    image?: StringNullableFilter<"User"> | string | null
    password?: StringNullableFilter<"User"> | string | null
    cid?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    accounts?: AccountListRelationFilter
    sessions?: SessionListRelationFilter
    assignedTasks?: TaskListRelationFilter
    createdTasks?: TaskListRelationFilter
    aiConversations?: AIConversationListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrderInput | SortOrder
    email?: SortOrder
    emailVerified?: SortOrderInput | SortOrder
    emailVerificationToken?: SortOrderInput | SortOrder
    emailTokenExpires?: SortOrderInput | SortOrder
    image?: SortOrderInput | SortOrder
    password?: SortOrderInput | SortOrder
    cid?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    role?: SortOrder
    accounts?: AccountOrderByRelationAggregateInput
    sessions?: SessionOrderByRelationAggregateInput
    assignedTasks?: TaskOrderByRelationAggregateInput
    createdTasks?: TaskOrderByRelationAggregateInput
    aiConversations?: AIConversationOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    emailVerificationToken?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringNullableFilter<"User"> | string | null
    emailVerified?: DateTimeNullableFilter<"User"> | Date | string | null
    emailTokenExpires?: DateTimeNullableFilter<"User"> | Date | string | null
    image?: StringNullableFilter<"User"> | string | null
    password?: StringNullableFilter<"User"> | string | null
    cid?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    accounts?: AccountListRelationFilter
    sessions?: SessionListRelationFilter
    assignedTasks?: TaskListRelationFilter
    createdTasks?: TaskListRelationFilter
    aiConversations?: AIConversationListRelationFilter
  }, "id" | "email" | "emailVerificationToken">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrderInput | SortOrder
    email?: SortOrder
    emailVerified?: SortOrderInput | SortOrder
    emailVerificationToken?: SortOrderInput | SortOrder
    emailTokenExpires?: SortOrderInput | SortOrder
    image?: SortOrderInput | SortOrder
    password?: SortOrderInput | SortOrder
    cid?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    role?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    name?: StringNullableWithAggregatesFilter<"User"> | string | null
    email?: StringWithAggregatesFilter<"User"> | string
    emailVerified?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    emailVerificationToken?: StringNullableWithAggregatesFilter<"User"> | string | null
    emailTokenExpires?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    image?: StringNullableWithAggregatesFilter<"User"> | string | null
    password?: StringNullableWithAggregatesFilter<"User"> | string | null
    cid?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    role?: EnumUserRoleWithAggregatesFilter<"User"> | $Enums.UserRole
  }

  export type VerificationTokenWhereInput = {
    AND?: VerificationTokenWhereInput | VerificationTokenWhereInput[]
    OR?: VerificationTokenWhereInput[]
    NOT?: VerificationTokenWhereInput | VerificationTokenWhereInput[]
    identifier?: StringFilter<"VerificationToken"> | string
    token?: StringFilter<"VerificationToken"> | string
    expires?: DateTimeFilter<"VerificationToken"> | Date | string
  }

  export type VerificationTokenOrderByWithRelationInput = {
    identifier?: SortOrder
    token?: SortOrder
    expires?: SortOrder
  }

  export type VerificationTokenWhereUniqueInput = Prisma.AtLeast<{
    identifier_token?: VerificationTokenIdentifierTokenCompoundUniqueInput
    AND?: VerificationTokenWhereInput | VerificationTokenWhereInput[]
    OR?: VerificationTokenWhereInput[]
    NOT?: VerificationTokenWhereInput | VerificationTokenWhereInput[]
    identifier?: StringFilter<"VerificationToken"> | string
    token?: StringFilter<"VerificationToken"> | string
    expires?: DateTimeFilter<"VerificationToken"> | Date | string
  }, "identifier_token">

  export type VerificationTokenOrderByWithAggregationInput = {
    identifier?: SortOrder
    token?: SortOrder
    expires?: SortOrder
    _count?: VerificationTokenCountOrderByAggregateInput
    _max?: VerificationTokenMaxOrderByAggregateInput
    _min?: VerificationTokenMinOrderByAggregateInput
  }

  export type VerificationTokenScalarWhereWithAggregatesInput = {
    AND?: VerificationTokenScalarWhereWithAggregatesInput | VerificationTokenScalarWhereWithAggregatesInput[]
    OR?: VerificationTokenScalarWhereWithAggregatesInput[]
    NOT?: VerificationTokenScalarWhereWithAggregatesInput | VerificationTokenScalarWhereWithAggregatesInput[]
    identifier?: StringWithAggregatesFilter<"VerificationToken"> | string
    token?: StringWithAggregatesFilter<"VerificationToken"> | string
    expires?: DateTimeWithAggregatesFilter<"VerificationToken"> | Date | string
  }

  export type TaskWhereInput = {
    AND?: TaskWhereInput | TaskWhereInput[]
    OR?: TaskWhereInput[]
    NOT?: TaskWhereInput | TaskWhereInput[]
    id?: StringFilter<"Task"> | string
    title?: StringFilter<"Task"> | string
    description?: StringFilter<"Task"> | string
    priority?: EnumTaskPriorityFilter<"Task"> | $Enums.TaskPriority
    status?: EnumTaskStatusNewFilter<"Task"> | $Enums.TaskStatusNew
    dueDate?: DateTimeFilter<"Task"> | Date | string
    position?: IntFilter<"Task"> | number
    assignedToId?: StringFilter<"Task"> | string
    createdById?: StringFilter<"Task"> | string
    boardSectionId?: StringFilter<"Task"> | string
    createdAt?: DateTimeFilter<"Task"> | Date | string
    updatedAt?: DateTimeFilter<"Task"> | Date | string
    assignedTo?: XOR<UserScalarRelationFilter, UserWhereInput>
    createdBy?: XOR<UserScalarRelationFilter, UserWhereInput>
    boardSection?: XOR<BoardSectionScalarRelationFilter, BoardSectionWhereInput>
    history?: TaskHistoryListRelationFilter
    embedding?: XOR<TaskEmbeddingNullableScalarRelationFilter, TaskEmbeddingWhereInput> | null
  }

  export type TaskOrderByWithRelationInput = {
    id?: SortOrder
    title?: SortOrder
    description?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    dueDate?: SortOrder
    position?: SortOrder
    assignedToId?: SortOrder
    createdById?: SortOrder
    boardSectionId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    assignedTo?: UserOrderByWithRelationInput
    createdBy?: UserOrderByWithRelationInput
    boardSection?: BoardSectionOrderByWithRelationInput
    history?: TaskHistoryOrderByRelationAggregateInput
    embedding?: TaskEmbeddingOrderByWithRelationInput
  }

  export type TaskWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TaskWhereInput | TaskWhereInput[]
    OR?: TaskWhereInput[]
    NOT?: TaskWhereInput | TaskWhereInput[]
    title?: StringFilter<"Task"> | string
    description?: StringFilter<"Task"> | string
    priority?: EnumTaskPriorityFilter<"Task"> | $Enums.TaskPriority
    status?: EnumTaskStatusNewFilter<"Task"> | $Enums.TaskStatusNew
    dueDate?: DateTimeFilter<"Task"> | Date | string
    position?: IntFilter<"Task"> | number
    assignedToId?: StringFilter<"Task"> | string
    createdById?: StringFilter<"Task"> | string
    boardSectionId?: StringFilter<"Task"> | string
    createdAt?: DateTimeFilter<"Task"> | Date | string
    updatedAt?: DateTimeFilter<"Task"> | Date | string
    assignedTo?: XOR<UserScalarRelationFilter, UserWhereInput>
    createdBy?: XOR<UserScalarRelationFilter, UserWhereInput>
    boardSection?: XOR<BoardSectionScalarRelationFilter, BoardSectionWhereInput>
    history?: TaskHistoryListRelationFilter
    embedding?: XOR<TaskEmbeddingNullableScalarRelationFilter, TaskEmbeddingWhereInput> | null
  }, "id">

  export type TaskOrderByWithAggregationInput = {
    id?: SortOrder
    title?: SortOrder
    description?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    dueDate?: SortOrder
    position?: SortOrder
    assignedToId?: SortOrder
    createdById?: SortOrder
    boardSectionId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TaskCountOrderByAggregateInput
    _avg?: TaskAvgOrderByAggregateInput
    _max?: TaskMaxOrderByAggregateInput
    _min?: TaskMinOrderByAggregateInput
    _sum?: TaskSumOrderByAggregateInput
  }

  export type TaskScalarWhereWithAggregatesInput = {
    AND?: TaskScalarWhereWithAggregatesInput | TaskScalarWhereWithAggregatesInput[]
    OR?: TaskScalarWhereWithAggregatesInput[]
    NOT?: TaskScalarWhereWithAggregatesInput | TaskScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Task"> | string
    title?: StringWithAggregatesFilter<"Task"> | string
    description?: StringWithAggregatesFilter<"Task"> | string
    priority?: EnumTaskPriorityWithAggregatesFilter<"Task"> | $Enums.TaskPriority
    status?: EnumTaskStatusNewWithAggregatesFilter<"Task"> | $Enums.TaskStatusNew
    dueDate?: DateTimeWithAggregatesFilter<"Task"> | Date | string
    position?: IntWithAggregatesFilter<"Task"> | number
    assignedToId?: StringWithAggregatesFilter<"Task"> | string
    createdById?: StringWithAggregatesFilter<"Task"> | string
    boardSectionId?: StringWithAggregatesFilter<"Task"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Task"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Task"> | Date | string
  }

  export type BoardWhereInput = {
    AND?: BoardWhereInput | BoardWhereInput[]
    OR?: BoardWhereInput[]
    NOT?: BoardWhereInput | BoardWhereInput[]
    id?: StringFilter<"Board"> | string
    name?: StringFilter<"Board"> | string
    description?: StringNullableFilter<"Board"> | string | null
    createdBy?: StringFilter<"Board"> | string
    createdAt?: DateTimeFilter<"Board"> | Date | string
    updatedAt?: DateTimeFilter<"Board"> | Date | string
    access?: StringNullableListFilter<"Board">
    boardSections?: BoardSectionListRelationFilter
    embedding?: XOR<BoardEmbeddingNullableScalarRelationFilter, BoardEmbeddingWhereInput> | null
  }

  export type BoardOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    access?: SortOrder
    boardSections?: BoardSectionOrderByRelationAggregateInput
    embedding?: BoardEmbeddingOrderByWithRelationInput
  }

  export type BoardWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: BoardWhereInput | BoardWhereInput[]
    OR?: BoardWhereInput[]
    NOT?: BoardWhereInput | BoardWhereInput[]
    name?: StringFilter<"Board"> | string
    description?: StringNullableFilter<"Board"> | string | null
    createdBy?: StringFilter<"Board"> | string
    createdAt?: DateTimeFilter<"Board"> | Date | string
    updatedAt?: DateTimeFilter<"Board"> | Date | string
    access?: StringNullableListFilter<"Board">
    boardSections?: BoardSectionListRelationFilter
    embedding?: XOR<BoardEmbeddingNullableScalarRelationFilter, BoardEmbeddingWhereInput> | null
  }, "id">

  export type BoardOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    access?: SortOrder
    _count?: BoardCountOrderByAggregateInput
    _max?: BoardMaxOrderByAggregateInput
    _min?: BoardMinOrderByAggregateInput
  }

  export type BoardScalarWhereWithAggregatesInput = {
    AND?: BoardScalarWhereWithAggregatesInput | BoardScalarWhereWithAggregatesInput[]
    OR?: BoardScalarWhereWithAggregatesInput[]
    NOT?: BoardScalarWhereWithAggregatesInput | BoardScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Board"> | string
    name?: StringWithAggregatesFilter<"Board"> | string
    description?: StringNullableWithAggregatesFilter<"Board"> | string | null
    createdBy?: StringWithAggregatesFilter<"Board"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Board"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Board"> | Date | string
    access?: StringNullableListFilter<"Board">
  }

  export type BoardSectionWhereInput = {
    AND?: BoardSectionWhereInput | BoardSectionWhereInput[]
    OR?: BoardSectionWhereInput[]
    NOT?: BoardSectionWhereInput | BoardSectionWhereInput[]
    id?: StringFilter<"BoardSection"> | string
    name?: StringFilter<"BoardSection"> | string
    position?: IntFilter<"BoardSection"> | number
    createdAt?: DateTimeFilter<"BoardSection"> | Date | string
    updatedAt?: DateTimeFilter<"BoardSection"> | Date | string
    boardId?: StringFilter<"BoardSection"> | string
    board?: XOR<BoardScalarRelationFilter, BoardWhereInput>
    tasks?: TaskListRelationFilter
  }

  export type BoardSectionOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    position?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    boardId?: SortOrder
    board?: BoardOrderByWithRelationInput
    tasks?: TaskOrderByRelationAggregateInput
  }

  export type BoardSectionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: BoardSectionWhereInput | BoardSectionWhereInput[]
    OR?: BoardSectionWhereInput[]
    NOT?: BoardSectionWhereInput | BoardSectionWhereInput[]
    name?: StringFilter<"BoardSection"> | string
    position?: IntFilter<"BoardSection"> | number
    createdAt?: DateTimeFilter<"BoardSection"> | Date | string
    updatedAt?: DateTimeFilter<"BoardSection"> | Date | string
    boardId?: StringFilter<"BoardSection"> | string
    board?: XOR<BoardScalarRelationFilter, BoardWhereInput>
    tasks?: TaskListRelationFilter
  }, "id">

  export type BoardSectionOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    position?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    boardId?: SortOrder
    _count?: BoardSectionCountOrderByAggregateInput
    _avg?: BoardSectionAvgOrderByAggregateInput
    _max?: BoardSectionMaxOrderByAggregateInput
    _min?: BoardSectionMinOrderByAggregateInput
    _sum?: BoardSectionSumOrderByAggregateInput
  }

  export type BoardSectionScalarWhereWithAggregatesInput = {
    AND?: BoardSectionScalarWhereWithAggregatesInput | BoardSectionScalarWhereWithAggregatesInput[]
    OR?: BoardSectionScalarWhereWithAggregatesInput[]
    NOT?: BoardSectionScalarWhereWithAggregatesInput | BoardSectionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"BoardSection"> | string
    name?: StringWithAggregatesFilter<"BoardSection"> | string
    position?: IntWithAggregatesFilter<"BoardSection"> | number
    createdAt?: DateTimeWithAggregatesFilter<"BoardSection"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"BoardSection"> | Date | string
    boardId?: StringWithAggregatesFilter<"BoardSection"> | string
  }

  export type TaskHistoryWhereInput = {
    AND?: TaskHistoryWhereInput | TaskHistoryWhereInput[]
    OR?: TaskHistoryWhereInput[]
    NOT?: TaskHistoryWhereInput | TaskHistoryWhereInput[]
    id?: StringFilter<"TaskHistory"> | string
    taskId?: StringFilter<"TaskHistory"> | string
    createdAt?: DateTimeFilter<"TaskHistory"> | Date | string
    updatedAt?: DateTimeFilter<"TaskHistory"> | Date | string
    description?: StringNullableFilter<"TaskHistory"> | string | null
    task?: XOR<TaskScalarRelationFilter, TaskWhereInput>
  }

  export type TaskHistoryOrderByWithRelationInput = {
    id?: SortOrder
    taskId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    description?: SortOrderInput | SortOrder
    task?: TaskOrderByWithRelationInput
  }

  export type TaskHistoryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TaskHistoryWhereInput | TaskHistoryWhereInput[]
    OR?: TaskHistoryWhereInput[]
    NOT?: TaskHistoryWhereInput | TaskHistoryWhereInput[]
    taskId?: StringFilter<"TaskHistory"> | string
    createdAt?: DateTimeFilter<"TaskHistory"> | Date | string
    updatedAt?: DateTimeFilter<"TaskHistory"> | Date | string
    description?: StringNullableFilter<"TaskHistory"> | string | null
    task?: XOR<TaskScalarRelationFilter, TaskWhereInput>
  }, "id">

  export type TaskHistoryOrderByWithAggregationInput = {
    id?: SortOrder
    taskId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    description?: SortOrderInput | SortOrder
    _count?: TaskHistoryCountOrderByAggregateInput
    _max?: TaskHistoryMaxOrderByAggregateInput
    _min?: TaskHistoryMinOrderByAggregateInput
  }

  export type TaskHistoryScalarWhereWithAggregatesInput = {
    AND?: TaskHistoryScalarWhereWithAggregatesInput | TaskHistoryScalarWhereWithAggregatesInput[]
    OR?: TaskHistoryScalarWhereWithAggregatesInput[]
    NOT?: TaskHistoryScalarWhereWithAggregatesInput | TaskHistoryScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TaskHistory"> | string
    taskId?: StringWithAggregatesFilter<"TaskHistory"> | string
    createdAt?: DateTimeWithAggregatesFilter<"TaskHistory"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TaskHistory"> | Date | string
    description?: StringNullableWithAggregatesFilter<"TaskHistory"> | string | null
  }

  export type TaskEmbeddingWhereInput = {
    AND?: TaskEmbeddingWhereInput | TaskEmbeddingWhereInput[]
    OR?: TaskEmbeddingWhereInput[]
    NOT?: TaskEmbeddingWhereInput | TaskEmbeddingWhereInput[]
    id?: StringFilter<"TaskEmbedding"> | string
    taskId?: StringFilter<"TaskEmbedding"> | string
    content?: StringFilter<"TaskEmbedding"> | string
    metadata?: JsonFilter<"TaskEmbedding">
    createdAt?: DateTimeFilter<"TaskEmbedding"> | Date | string
    updatedAt?: DateTimeFilter<"TaskEmbedding"> | Date | string
    task?: XOR<TaskScalarRelationFilter, TaskWhereInput>
  }

  export type TaskEmbeddingOrderByWithRelationInput = {
    id?: SortOrder
    taskId?: SortOrder
    content?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    task?: TaskOrderByWithRelationInput
  }

  export type TaskEmbeddingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    taskId?: string
    AND?: TaskEmbeddingWhereInput | TaskEmbeddingWhereInput[]
    OR?: TaskEmbeddingWhereInput[]
    NOT?: TaskEmbeddingWhereInput | TaskEmbeddingWhereInput[]
    content?: StringFilter<"TaskEmbedding"> | string
    metadata?: JsonFilter<"TaskEmbedding">
    createdAt?: DateTimeFilter<"TaskEmbedding"> | Date | string
    updatedAt?: DateTimeFilter<"TaskEmbedding"> | Date | string
    task?: XOR<TaskScalarRelationFilter, TaskWhereInput>
  }, "id" | "taskId">

  export type TaskEmbeddingOrderByWithAggregationInput = {
    id?: SortOrder
    taskId?: SortOrder
    content?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TaskEmbeddingCountOrderByAggregateInput
    _max?: TaskEmbeddingMaxOrderByAggregateInput
    _min?: TaskEmbeddingMinOrderByAggregateInput
  }

  export type TaskEmbeddingScalarWhereWithAggregatesInput = {
    AND?: TaskEmbeddingScalarWhereWithAggregatesInput | TaskEmbeddingScalarWhereWithAggregatesInput[]
    OR?: TaskEmbeddingScalarWhereWithAggregatesInput[]
    NOT?: TaskEmbeddingScalarWhereWithAggregatesInput | TaskEmbeddingScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TaskEmbedding"> | string
    taskId?: StringWithAggregatesFilter<"TaskEmbedding"> | string
    content?: StringWithAggregatesFilter<"TaskEmbedding"> | string
    metadata?: JsonWithAggregatesFilter<"TaskEmbedding">
    createdAt?: DateTimeWithAggregatesFilter<"TaskEmbedding"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TaskEmbedding"> | Date | string
  }

  export type BoardEmbeddingWhereInput = {
    AND?: BoardEmbeddingWhereInput | BoardEmbeddingWhereInput[]
    OR?: BoardEmbeddingWhereInput[]
    NOT?: BoardEmbeddingWhereInput | BoardEmbeddingWhereInput[]
    id?: StringFilter<"BoardEmbedding"> | string
    boardId?: StringFilter<"BoardEmbedding"> | string
    content?: StringFilter<"BoardEmbedding"> | string
    metadata?: JsonFilter<"BoardEmbedding">
    createdAt?: DateTimeFilter<"BoardEmbedding"> | Date | string
    updatedAt?: DateTimeFilter<"BoardEmbedding"> | Date | string
    board?: XOR<BoardScalarRelationFilter, BoardWhereInput>
  }

  export type BoardEmbeddingOrderByWithRelationInput = {
    id?: SortOrder
    boardId?: SortOrder
    content?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    board?: BoardOrderByWithRelationInput
  }

  export type BoardEmbeddingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    boardId?: string
    AND?: BoardEmbeddingWhereInput | BoardEmbeddingWhereInput[]
    OR?: BoardEmbeddingWhereInput[]
    NOT?: BoardEmbeddingWhereInput | BoardEmbeddingWhereInput[]
    content?: StringFilter<"BoardEmbedding"> | string
    metadata?: JsonFilter<"BoardEmbedding">
    createdAt?: DateTimeFilter<"BoardEmbedding"> | Date | string
    updatedAt?: DateTimeFilter<"BoardEmbedding"> | Date | string
    board?: XOR<BoardScalarRelationFilter, BoardWhereInput>
  }, "id" | "boardId">

  export type BoardEmbeddingOrderByWithAggregationInput = {
    id?: SortOrder
    boardId?: SortOrder
    content?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: BoardEmbeddingCountOrderByAggregateInput
    _max?: BoardEmbeddingMaxOrderByAggregateInput
    _min?: BoardEmbeddingMinOrderByAggregateInput
  }

  export type BoardEmbeddingScalarWhereWithAggregatesInput = {
    AND?: BoardEmbeddingScalarWhereWithAggregatesInput | BoardEmbeddingScalarWhereWithAggregatesInput[]
    OR?: BoardEmbeddingScalarWhereWithAggregatesInput[]
    NOT?: BoardEmbeddingScalarWhereWithAggregatesInput | BoardEmbeddingScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"BoardEmbedding"> | string
    boardId?: StringWithAggregatesFilter<"BoardEmbedding"> | string
    content?: StringWithAggregatesFilter<"BoardEmbedding"> | string
    metadata?: JsonWithAggregatesFilter<"BoardEmbedding">
    createdAt?: DateTimeWithAggregatesFilter<"BoardEmbedding"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"BoardEmbedding"> | Date | string
  }

  export type AIConversationWhereInput = {
    AND?: AIConversationWhereInput | AIConversationWhereInput[]
    OR?: AIConversationWhereInput[]
    NOT?: AIConversationWhereInput | AIConversationWhereInput[]
    id?: StringFilter<"AIConversation"> | string
    userId?: StringFilter<"AIConversation"> | string
    companyId?: StringFilter<"AIConversation"> | string
    title?: StringNullableFilter<"AIConversation"> | string | null
    context?: JsonNullableFilter<"AIConversation">
    createdAt?: DateTimeFilter<"AIConversation"> | Date | string
    updatedAt?: DateTimeFilter<"AIConversation"> | Date | string
    messages?: AIMessageListRelationFilter
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type AIConversationOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    companyId?: SortOrder
    title?: SortOrderInput | SortOrder
    context?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    messages?: AIMessageOrderByRelationAggregateInput
    user?: UserOrderByWithRelationInput
  }

  export type AIConversationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AIConversationWhereInput | AIConversationWhereInput[]
    OR?: AIConversationWhereInput[]
    NOT?: AIConversationWhereInput | AIConversationWhereInput[]
    userId?: StringFilter<"AIConversation"> | string
    companyId?: StringFilter<"AIConversation"> | string
    title?: StringNullableFilter<"AIConversation"> | string | null
    context?: JsonNullableFilter<"AIConversation">
    createdAt?: DateTimeFilter<"AIConversation"> | Date | string
    updatedAt?: DateTimeFilter<"AIConversation"> | Date | string
    messages?: AIMessageListRelationFilter
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type AIConversationOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    companyId?: SortOrder
    title?: SortOrderInput | SortOrder
    context?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AIConversationCountOrderByAggregateInput
    _max?: AIConversationMaxOrderByAggregateInput
    _min?: AIConversationMinOrderByAggregateInput
  }

  export type AIConversationScalarWhereWithAggregatesInput = {
    AND?: AIConversationScalarWhereWithAggregatesInput | AIConversationScalarWhereWithAggregatesInput[]
    OR?: AIConversationScalarWhereWithAggregatesInput[]
    NOT?: AIConversationScalarWhereWithAggregatesInput | AIConversationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AIConversation"> | string
    userId?: StringWithAggregatesFilter<"AIConversation"> | string
    companyId?: StringWithAggregatesFilter<"AIConversation"> | string
    title?: StringNullableWithAggregatesFilter<"AIConversation"> | string | null
    context?: JsonNullableWithAggregatesFilter<"AIConversation">
    createdAt?: DateTimeWithAggregatesFilter<"AIConversation"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AIConversation"> | Date | string
  }

  export type AIMessageWhereInput = {
    AND?: AIMessageWhereInput | AIMessageWhereInput[]
    OR?: AIMessageWhereInput[]
    NOT?: AIMessageWhereInput | AIMessageWhereInput[]
    id?: StringFilter<"AIMessage"> | string
    conversationId?: StringFilter<"AIMessage"> | string
    role?: StringFilter<"AIMessage"> | string
    content?: StringFilter<"AIMessage"> | string
    metadata?: JsonNullableFilter<"AIMessage">
    createdAt?: DateTimeFilter<"AIMessage"> | Date | string
    conversation?: XOR<AIConversationScalarRelationFilter, AIConversationWhereInput>
  }

  export type AIMessageOrderByWithRelationInput = {
    id?: SortOrder
    conversationId?: SortOrder
    role?: SortOrder
    content?: SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    conversation?: AIConversationOrderByWithRelationInput
  }

  export type AIMessageWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AIMessageWhereInput | AIMessageWhereInput[]
    OR?: AIMessageWhereInput[]
    NOT?: AIMessageWhereInput | AIMessageWhereInput[]
    conversationId?: StringFilter<"AIMessage"> | string
    role?: StringFilter<"AIMessage"> | string
    content?: StringFilter<"AIMessage"> | string
    metadata?: JsonNullableFilter<"AIMessage">
    createdAt?: DateTimeFilter<"AIMessage"> | Date | string
    conversation?: XOR<AIConversationScalarRelationFilter, AIConversationWhereInput>
  }, "id">

  export type AIMessageOrderByWithAggregationInput = {
    id?: SortOrder
    conversationId?: SortOrder
    role?: SortOrder
    content?: SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: AIMessageCountOrderByAggregateInput
    _max?: AIMessageMaxOrderByAggregateInput
    _min?: AIMessageMinOrderByAggregateInput
  }

  export type AIMessageScalarWhereWithAggregatesInput = {
    AND?: AIMessageScalarWhereWithAggregatesInput | AIMessageScalarWhereWithAggregatesInput[]
    OR?: AIMessageScalarWhereWithAggregatesInput[]
    NOT?: AIMessageScalarWhereWithAggregatesInput | AIMessageScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AIMessage"> | string
    conversationId?: StringWithAggregatesFilter<"AIMessage"> | string
    role?: StringWithAggregatesFilter<"AIMessage"> | string
    content?: StringWithAggregatesFilter<"AIMessage"> | string
    metadata?: JsonNullableWithAggregatesFilter<"AIMessage">
    createdAt?: DateTimeWithAggregatesFilter<"AIMessage"> | Date | string
  }

  export type AccountCreateInput = {
    id?: string
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
    user: UserCreateNestedOneWithoutAccountsInput
  }

  export type AccountUncheckedCreateInput = {
    id?: string
    userId: string
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
  }

  export type AccountUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
    user?: UserUpdateOneRequiredWithoutAccountsNestedInput
  }

  export type AccountUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AccountCreateManyInput = {
    id?: string
    userId: string
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
  }

  export type AccountUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AccountUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SessionCreateInput = {
    id?: string
    sessionToken: string
    expires: Date | string
    user: UserCreateNestedOneWithoutSessionsInput
  }

  export type SessionUncheckedCreateInput = {
    id?: string
    sessionToken: string
    userId: string
    expires: Date | string
  }

  export type SessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionToken?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSessionsNestedInput
  }

  export type SessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionToken?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateManyInput = {
    id?: string
    sessionToken: string
    userId: string
    expires: Date | string
  }

  export type SessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionToken?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionToken?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    accounts?: AccountCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    assignedTasks?: TaskCreateNestedManyWithoutAssignedToInput
    createdTasks?: TaskCreateNestedManyWithoutCreatedByInput
    aiConversations?: AIConversationCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssignedToInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatedByInput
    aiConversations?: AIConversationUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    accounts?: AccountUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssignedToNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatedByNestedInput
    aiConversations?: AIConversationUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssignedToNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatedByNestedInput
    aiConversations?: AIConversationUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
  }

  export type VerificationTokenCreateInput = {
    identifier: string
    token: string
    expires: Date | string
  }

  export type VerificationTokenUncheckedCreateInput = {
    identifier: string
    token: string
    expires: Date | string
  }

  export type VerificationTokenUpdateInput = {
    identifier?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationTokenUncheckedUpdateInput = {
    identifier?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationTokenCreateManyInput = {
    identifier: string
    token: string
    expires: Date | string
  }

  export type VerificationTokenUpdateManyMutationInput = {
    identifier?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationTokenUncheckedUpdateManyInput = {
    identifier?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskCreateInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    assignedTo: UserCreateNestedOneWithoutAssignedTasksInput
    createdBy: UserCreateNestedOneWithoutCreatedTasksInput
    boardSection: BoardSectionCreateNestedOneWithoutTasksInput
    history?: TaskHistoryCreateNestedManyWithoutTaskInput
    embedding?: TaskEmbeddingCreateNestedOneWithoutTaskInput
  }

  export type TaskUncheckedCreateInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    assignedToId: string
    createdById: string
    boardSectionId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    history?: TaskHistoryUncheckedCreateNestedManyWithoutTaskInput
    embedding?: TaskEmbeddingUncheckedCreateNestedOneWithoutTaskInput
  }

  export type TaskUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignedTo?: UserUpdateOneRequiredWithoutAssignedTasksNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    boardSection?: BoardSectionUpdateOneRequiredWithoutTasksNestedInput
    history?: TaskHistoryUpdateManyWithoutTaskNestedInput
    embedding?: TaskEmbeddingUpdateOneWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    assignedToId?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    boardSectionId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    history?: TaskHistoryUncheckedUpdateManyWithoutTaskNestedInput
    embedding?: TaskEmbeddingUncheckedUpdateOneWithoutTaskNestedInput
  }

  export type TaskCreateManyInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    assignedToId: string
    createdById: string
    boardSectionId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    assignedToId?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    boardSectionId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BoardCreateInput = {
    id?: string
    name: string
    description?: string | null
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    access?: BoardCreateaccessInput | string[]
    boardSections?: BoardSectionCreateNestedManyWithoutBoardInput
    embedding?: BoardEmbeddingCreateNestedOneWithoutBoardInput
  }

  export type BoardUncheckedCreateInput = {
    id?: string
    name: string
    description?: string | null
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    access?: BoardCreateaccessInput | string[]
    boardSections?: BoardSectionUncheckedCreateNestedManyWithoutBoardInput
    embedding?: BoardEmbeddingUncheckedCreateNestedOneWithoutBoardInput
  }

  export type BoardUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    access?: BoardUpdateaccessInput | string[]
    boardSections?: BoardSectionUpdateManyWithoutBoardNestedInput
    embedding?: BoardEmbeddingUpdateOneWithoutBoardNestedInput
  }

  export type BoardUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    access?: BoardUpdateaccessInput | string[]
    boardSections?: BoardSectionUncheckedUpdateManyWithoutBoardNestedInput
    embedding?: BoardEmbeddingUncheckedUpdateOneWithoutBoardNestedInput
  }

  export type BoardCreateManyInput = {
    id?: string
    name: string
    description?: string | null
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    access?: BoardCreateaccessInput | string[]
  }

  export type BoardUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    access?: BoardUpdateaccessInput | string[]
  }

  export type BoardUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    access?: BoardUpdateaccessInput | string[]
  }

  export type BoardSectionCreateInput = {
    id?: string
    name: string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    board: BoardCreateNestedOneWithoutBoardSectionsInput
    tasks?: TaskCreateNestedManyWithoutBoardSectionInput
  }

  export type BoardSectionUncheckedCreateInput = {
    id?: string
    name: string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    boardId: string
    tasks?: TaskUncheckedCreateNestedManyWithoutBoardSectionInput
  }

  export type BoardSectionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    board?: BoardUpdateOneRequiredWithoutBoardSectionsNestedInput
    tasks?: TaskUpdateManyWithoutBoardSectionNestedInput
  }

  export type BoardSectionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    boardId?: StringFieldUpdateOperationsInput | string
    tasks?: TaskUncheckedUpdateManyWithoutBoardSectionNestedInput
  }

  export type BoardSectionCreateManyInput = {
    id?: string
    name: string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    boardId: string
  }

  export type BoardSectionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BoardSectionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    boardId?: StringFieldUpdateOperationsInput | string
  }

  export type TaskHistoryCreateInput = {
    id?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    description?: string | null
    task: TaskCreateNestedOneWithoutHistoryInput
  }

  export type TaskHistoryUncheckedCreateInput = {
    id?: string
    taskId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    description?: string | null
  }

  export type TaskHistoryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    task?: TaskUpdateOneRequiredWithoutHistoryNestedInput
  }

  export type TaskHistoryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TaskHistoryCreateManyInput = {
    id?: string
    taskId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    description?: string | null
  }

  export type TaskHistoryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TaskHistoryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TaskEmbeddingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    task?: TaskUpdateOneRequiredWithoutEmbeddingNestedInput
  }

  export type TaskEmbeddingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskEmbeddingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskEmbeddingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    taskId?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BoardEmbeddingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    board?: BoardUpdateOneRequiredWithoutEmbeddingNestedInput
  }

  export type BoardEmbeddingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    boardId?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BoardEmbeddingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BoardEmbeddingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    boardId?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AIConversationCreateInput = {
    id?: string
    companyId: string
    title?: string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    messages?: AIMessageCreateNestedManyWithoutConversationInput
    user: UserCreateNestedOneWithoutAiConversationsInput
  }

  export type AIConversationUncheckedCreateInput = {
    id?: string
    userId: string
    companyId: string
    title?: string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    messages?: AIMessageUncheckedCreateNestedManyWithoutConversationInput
  }

  export type AIConversationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    messages?: AIMessageUpdateManyWithoutConversationNestedInput
    user?: UserUpdateOneRequiredWithoutAiConversationsNestedInput
  }

  export type AIConversationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    messages?: AIMessageUncheckedUpdateManyWithoutConversationNestedInput
  }

  export type AIConversationCreateManyInput = {
    id?: string
    userId: string
    companyId: string
    title?: string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AIConversationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AIConversationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AIMessageCreateInput = {
    id?: string
    role: string
    content: string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    conversation: AIConversationCreateNestedOneWithoutMessagesInput
  }

  export type AIMessageUncheckedCreateInput = {
    id?: string
    conversationId: string
    role: string
    content: string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AIMessageUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    conversation?: AIConversationUpdateOneRequiredWithoutMessagesNestedInput
  }

  export type AIMessageUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    conversationId?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AIMessageCreateManyInput = {
    id?: string
    conversationId: string
    role: string
    content: string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AIMessageUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AIMessageUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    conversationId?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type AccountProviderProviderAccountIdCompoundUniqueInput = {
    provider: string
    providerAccountId: string
  }

  export type AccountCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    refresh_token?: SortOrder
    access_token?: SortOrder
    expires_at?: SortOrder
    token_type?: SortOrder
    scope?: SortOrder
    id_token?: SortOrder
    session_state?: SortOrder
  }

  export type AccountAvgOrderByAggregateInput = {
    expires_at?: SortOrder
  }

  export type AccountMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    refresh_token?: SortOrder
    access_token?: SortOrder
    expires_at?: SortOrder
    token_type?: SortOrder
    scope?: SortOrder
    id_token?: SortOrder
    session_state?: SortOrder
  }

  export type AccountMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    refresh_token?: SortOrder
    access_token?: SortOrder
    expires_at?: SortOrder
    token_type?: SortOrder
    scope?: SortOrder
    id_token?: SortOrder
    session_state?: SortOrder
  }

  export type AccountSumOrderByAggregateInput = {
    expires_at?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SessionCountOrderByAggregateInput = {
    id?: SortOrder
    sessionToken?: SortOrder
    userId?: SortOrder
    expires?: SortOrder
  }

  export type SessionMaxOrderByAggregateInput = {
    id?: SortOrder
    sessionToken?: SortOrder
    userId?: SortOrder
    expires?: SortOrder
  }

  export type SessionMinOrderByAggregateInput = {
    id?: SortOrder
    sessionToken?: SortOrder
    userId?: SortOrder
    expires?: SortOrder
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type EnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type AccountListRelationFilter = {
    every?: AccountWhereInput
    some?: AccountWhereInput
    none?: AccountWhereInput
  }

  export type SessionListRelationFilter = {
    every?: SessionWhereInput
    some?: SessionWhereInput
    none?: SessionWhereInput
  }

  export type TaskListRelationFilter = {
    every?: TaskWhereInput
    some?: TaskWhereInput
    none?: TaskWhereInput
  }

  export type AIConversationListRelationFilter = {
    every?: AIConversationWhereInput
    some?: AIConversationWhereInput
    none?: AIConversationWhereInput
  }

  export type AccountOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TaskOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AIConversationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    emailVerified?: SortOrder
    emailVerificationToken?: SortOrder
    emailTokenExpires?: SortOrder
    image?: SortOrder
    password?: SortOrder
    cid?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    role?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    emailVerified?: SortOrder
    emailVerificationToken?: SortOrder
    emailTokenExpires?: SortOrder
    image?: SortOrder
    password?: SortOrder
    cid?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    role?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    emailVerified?: SortOrder
    emailVerificationToken?: SortOrder
    emailTokenExpires?: SortOrder
    image?: SortOrder
    password?: SortOrder
    cid?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    role?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type EnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type VerificationTokenIdentifierTokenCompoundUniqueInput = {
    identifier: string
    token: string
  }

  export type VerificationTokenCountOrderByAggregateInput = {
    identifier?: SortOrder
    token?: SortOrder
    expires?: SortOrder
  }

  export type VerificationTokenMaxOrderByAggregateInput = {
    identifier?: SortOrder
    token?: SortOrder
    expires?: SortOrder
  }

  export type VerificationTokenMinOrderByAggregateInput = {
    identifier?: SortOrder
    token?: SortOrder
    expires?: SortOrder
  }

  export type EnumTaskPriorityFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskPriority | EnumTaskPriorityFieldRefInput<$PrismaModel>
    in?: $Enums.TaskPriority[] | ListEnumTaskPriorityFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskPriority[] | ListEnumTaskPriorityFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskPriorityFilter<$PrismaModel> | $Enums.TaskPriority
  }

  export type EnumTaskStatusNewFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatusNew | EnumTaskStatusNewFieldRefInput<$PrismaModel>
    in?: $Enums.TaskStatusNew[] | ListEnumTaskStatusNewFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskStatusNew[] | ListEnumTaskStatusNewFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskStatusNewFilter<$PrismaModel> | $Enums.TaskStatusNew
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type BoardSectionScalarRelationFilter = {
    is?: BoardSectionWhereInput
    isNot?: BoardSectionWhereInput
  }

  export type TaskHistoryListRelationFilter = {
    every?: TaskHistoryWhereInput
    some?: TaskHistoryWhereInput
    none?: TaskHistoryWhereInput
  }

  export type TaskEmbeddingNullableScalarRelationFilter = {
    is?: TaskEmbeddingWhereInput | null
    isNot?: TaskEmbeddingWhereInput | null
  }

  export type TaskHistoryOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TaskCountOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    description?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    dueDate?: SortOrder
    position?: SortOrder
    assignedToId?: SortOrder
    createdById?: SortOrder
    boardSectionId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskAvgOrderByAggregateInput = {
    position?: SortOrder
  }

  export type TaskMaxOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    description?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    dueDate?: SortOrder
    position?: SortOrder
    assignedToId?: SortOrder
    createdById?: SortOrder
    boardSectionId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskMinOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    description?: SortOrder
    priority?: SortOrder
    status?: SortOrder
    dueDate?: SortOrder
    position?: SortOrder
    assignedToId?: SortOrder
    createdById?: SortOrder
    boardSectionId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskSumOrderByAggregateInput = {
    position?: SortOrder
  }

  export type EnumTaskPriorityWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskPriority | EnumTaskPriorityFieldRefInput<$PrismaModel>
    in?: $Enums.TaskPriority[] | ListEnumTaskPriorityFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskPriority[] | ListEnumTaskPriorityFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskPriorityWithAggregatesFilter<$PrismaModel> | $Enums.TaskPriority
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTaskPriorityFilter<$PrismaModel>
    _max?: NestedEnumTaskPriorityFilter<$PrismaModel>
  }

  export type EnumTaskStatusNewWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatusNew | EnumTaskStatusNewFieldRefInput<$PrismaModel>
    in?: $Enums.TaskStatusNew[] | ListEnumTaskStatusNewFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskStatusNew[] | ListEnumTaskStatusNewFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskStatusNewWithAggregatesFilter<$PrismaModel> | $Enums.TaskStatusNew
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTaskStatusNewFilter<$PrismaModel>
    _max?: NestedEnumTaskStatusNewFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type BoardSectionListRelationFilter = {
    every?: BoardSectionWhereInput
    some?: BoardSectionWhereInput
    none?: BoardSectionWhereInput
  }

  export type BoardEmbeddingNullableScalarRelationFilter = {
    is?: BoardEmbeddingWhereInput | null
    isNot?: BoardEmbeddingWhereInput | null
  }

  export type BoardSectionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type BoardCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    access?: SortOrder
  }

  export type BoardMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BoardMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    createdBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BoardScalarRelationFilter = {
    is?: BoardWhereInput
    isNot?: BoardWhereInput
  }

  export type BoardSectionCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    position?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    boardId?: SortOrder
  }

  export type BoardSectionAvgOrderByAggregateInput = {
    position?: SortOrder
  }

  export type BoardSectionMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    position?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    boardId?: SortOrder
  }

  export type BoardSectionMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    position?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    boardId?: SortOrder
  }

  export type BoardSectionSumOrderByAggregateInput = {
    position?: SortOrder
  }

  export type TaskScalarRelationFilter = {
    is?: TaskWhereInput
    isNot?: TaskWhereInput
  }

  export type TaskHistoryCountOrderByAggregateInput = {
    id?: SortOrder
    taskId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    description?: SortOrder
  }

  export type TaskHistoryMaxOrderByAggregateInput = {
    id?: SortOrder
    taskId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    description?: SortOrder
  }

  export type TaskHistoryMinOrderByAggregateInput = {
    id?: SortOrder
    taskId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    description?: SortOrder
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type TaskEmbeddingCountOrderByAggregateInput = {
    id?: SortOrder
    taskId?: SortOrder
    content?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskEmbeddingMaxOrderByAggregateInput = {
    id?: SortOrder
    taskId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TaskEmbeddingMinOrderByAggregateInput = {
    id?: SortOrder
    taskId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type BoardEmbeddingCountOrderByAggregateInput = {
    id?: SortOrder
    boardId?: SortOrder
    content?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BoardEmbeddingMaxOrderByAggregateInput = {
    id?: SortOrder
    boardId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BoardEmbeddingMinOrderByAggregateInput = {
    id?: SortOrder
    boardId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type AIMessageListRelationFilter = {
    every?: AIMessageWhereInput
    some?: AIMessageWhereInput
    none?: AIMessageWhereInput
  }

  export type AIMessageOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AIConversationCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    companyId?: SortOrder
    title?: SortOrder
    context?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AIConversationMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    companyId?: SortOrder
    title?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AIConversationMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    companyId?: SortOrder
    title?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type AIConversationScalarRelationFilter = {
    is?: AIConversationWhereInput
    isNot?: AIConversationWhereInput
  }

  export type AIMessageCountOrderByAggregateInput = {
    id?: SortOrder
    conversationId?: SortOrder
    role?: SortOrder
    content?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
  }

  export type AIMessageMaxOrderByAggregateInput = {
    id?: SortOrder
    conversationId?: SortOrder
    role?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
  }

  export type AIMessageMinOrderByAggregateInput = {
    id?: SortOrder
    conversationId?: SortOrder
    role?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
  }

  export type UserCreateNestedOneWithoutAccountsInput = {
    create?: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAccountsInput
    connect?: UserWhereUniqueInput
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneRequiredWithoutAccountsNestedInput = {
    create?: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAccountsInput
    upsert?: UserUpsertWithoutAccountsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAccountsInput, UserUpdateWithoutAccountsInput>, UserUncheckedUpdateWithoutAccountsInput>
  }

  export type UserCreateNestedOneWithoutSessionsInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    connect?: UserWhereUniqueInput
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type UserUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    upsert?: UserUpsertWithoutSessionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSessionsInput, UserUpdateWithoutSessionsInput>, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type AccountCreateNestedManyWithoutUserInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
  }

  export type SessionCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type TaskCreateNestedManyWithoutAssignedToInput = {
    create?: XOR<TaskCreateWithoutAssignedToInput, TaskUncheckedCreateWithoutAssignedToInput> | TaskCreateWithoutAssignedToInput[] | TaskUncheckedCreateWithoutAssignedToInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutAssignedToInput | TaskCreateOrConnectWithoutAssignedToInput[]
    createMany?: TaskCreateManyAssignedToInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type TaskCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<TaskCreateWithoutCreatedByInput, TaskUncheckedCreateWithoutCreatedByInput> | TaskCreateWithoutCreatedByInput[] | TaskUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatedByInput | TaskCreateOrConnectWithoutCreatedByInput[]
    createMany?: TaskCreateManyCreatedByInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type AIConversationCreateNestedManyWithoutUserInput = {
    create?: XOR<AIConversationCreateWithoutUserInput, AIConversationUncheckedCreateWithoutUserInput> | AIConversationCreateWithoutUserInput[] | AIConversationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AIConversationCreateOrConnectWithoutUserInput | AIConversationCreateOrConnectWithoutUserInput[]
    createMany?: AIConversationCreateManyUserInputEnvelope
    connect?: AIConversationWhereUniqueInput | AIConversationWhereUniqueInput[]
  }

  export type AccountUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
  }

  export type SessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type TaskUncheckedCreateNestedManyWithoutAssignedToInput = {
    create?: XOR<TaskCreateWithoutAssignedToInput, TaskUncheckedCreateWithoutAssignedToInput> | TaskCreateWithoutAssignedToInput[] | TaskUncheckedCreateWithoutAssignedToInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutAssignedToInput | TaskCreateOrConnectWithoutAssignedToInput[]
    createMany?: TaskCreateManyAssignedToInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type TaskUncheckedCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<TaskCreateWithoutCreatedByInput, TaskUncheckedCreateWithoutCreatedByInput> | TaskCreateWithoutCreatedByInput[] | TaskUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatedByInput | TaskCreateOrConnectWithoutCreatedByInput[]
    createMany?: TaskCreateManyCreatedByInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type AIConversationUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AIConversationCreateWithoutUserInput, AIConversationUncheckedCreateWithoutUserInput> | AIConversationCreateWithoutUserInput[] | AIConversationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AIConversationCreateOrConnectWithoutUserInput | AIConversationCreateOrConnectWithoutUserInput[]
    createMany?: AIConversationCreateManyUserInputEnvelope
    connect?: AIConversationWhereUniqueInput | AIConversationWhereUniqueInput[]
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type EnumUserRoleFieldUpdateOperationsInput = {
    set?: $Enums.UserRole
  }

  export type AccountUpdateManyWithoutUserNestedInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    upsert?: AccountUpsertWithWhereUniqueWithoutUserInput | AccountUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    set?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    disconnect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    delete?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    update?: AccountUpdateWithWhereUniqueWithoutUserInput | AccountUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AccountUpdateManyWithWhereWithoutUserInput | AccountUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AccountScalarWhereInput | AccountScalarWhereInput[]
  }

  export type SessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type TaskUpdateManyWithoutAssignedToNestedInput = {
    create?: XOR<TaskCreateWithoutAssignedToInput, TaskUncheckedCreateWithoutAssignedToInput> | TaskCreateWithoutAssignedToInput[] | TaskUncheckedCreateWithoutAssignedToInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutAssignedToInput | TaskCreateOrConnectWithoutAssignedToInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutAssignedToInput | TaskUpsertWithWhereUniqueWithoutAssignedToInput[]
    createMany?: TaskCreateManyAssignedToInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutAssignedToInput | TaskUpdateWithWhereUniqueWithoutAssignedToInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutAssignedToInput | TaskUpdateManyWithWhereWithoutAssignedToInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type TaskUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<TaskCreateWithoutCreatedByInput, TaskUncheckedCreateWithoutCreatedByInput> | TaskCreateWithoutCreatedByInput[] | TaskUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatedByInput | TaskCreateOrConnectWithoutCreatedByInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutCreatedByInput | TaskUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: TaskCreateManyCreatedByInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutCreatedByInput | TaskUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutCreatedByInput | TaskUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type AIConversationUpdateManyWithoutUserNestedInput = {
    create?: XOR<AIConversationCreateWithoutUserInput, AIConversationUncheckedCreateWithoutUserInput> | AIConversationCreateWithoutUserInput[] | AIConversationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AIConversationCreateOrConnectWithoutUserInput | AIConversationCreateOrConnectWithoutUserInput[]
    upsert?: AIConversationUpsertWithWhereUniqueWithoutUserInput | AIConversationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AIConversationCreateManyUserInputEnvelope
    set?: AIConversationWhereUniqueInput | AIConversationWhereUniqueInput[]
    disconnect?: AIConversationWhereUniqueInput | AIConversationWhereUniqueInput[]
    delete?: AIConversationWhereUniqueInput | AIConversationWhereUniqueInput[]
    connect?: AIConversationWhereUniqueInput | AIConversationWhereUniqueInput[]
    update?: AIConversationUpdateWithWhereUniqueWithoutUserInput | AIConversationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AIConversationUpdateManyWithWhereWithoutUserInput | AIConversationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AIConversationScalarWhereInput | AIConversationScalarWhereInput[]
  }

  export type AccountUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    upsert?: AccountUpsertWithWhereUniqueWithoutUserInput | AccountUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    set?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    disconnect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    delete?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    update?: AccountUpdateWithWhereUniqueWithoutUserInput | AccountUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AccountUpdateManyWithWhereWithoutUserInput | AccountUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AccountScalarWhereInput | AccountScalarWhereInput[]
  }

  export type SessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type TaskUncheckedUpdateManyWithoutAssignedToNestedInput = {
    create?: XOR<TaskCreateWithoutAssignedToInput, TaskUncheckedCreateWithoutAssignedToInput> | TaskCreateWithoutAssignedToInput[] | TaskUncheckedCreateWithoutAssignedToInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutAssignedToInput | TaskCreateOrConnectWithoutAssignedToInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutAssignedToInput | TaskUpsertWithWhereUniqueWithoutAssignedToInput[]
    createMany?: TaskCreateManyAssignedToInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutAssignedToInput | TaskUpdateWithWhereUniqueWithoutAssignedToInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutAssignedToInput | TaskUpdateManyWithWhereWithoutAssignedToInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type TaskUncheckedUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<TaskCreateWithoutCreatedByInput, TaskUncheckedCreateWithoutCreatedByInput> | TaskCreateWithoutCreatedByInput[] | TaskUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutCreatedByInput | TaskCreateOrConnectWithoutCreatedByInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutCreatedByInput | TaskUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: TaskCreateManyCreatedByInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutCreatedByInput | TaskUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutCreatedByInput | TaskUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type AIConversationUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AIConversationCreateWithoutUserInput, AIConversationUncheckedCreateWithoutUserInput> | AIConversationCreateWithoutUserInput[] | AIConversationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AIConversationCreateOrConnectWithoutUserInput | AIConversationCreateOrConnectWithoutUserInput[]
    upsert?: AIConversationUpsertWithWhereUniqueWithoutUserInput | AIConversationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AIConversationCreateManyUserInputEnvelope
    set?: AIConversationWhereUniqueInput | AIConversationWhereUniqueInput[]
    disconnect?: AIConversationWhereUniqueInput | AIConversationWhereUniqueInput[]
    delete?: AIConversationWhereUniqueInput | AIConversationWhereUniqueInput[]
    connect?: AIConversationWhereUniqueInput | AIConversationWhereUniqueInput[]
    update?: AIConversationUpdateWithWhereUniqueWithoutUserInput | AIConversationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AIConversationUpdateManyWithWhereWithoutUserInput | AIConversationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AIConversationScalarWhereInput | AIConversationScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutAssignedTasksInput = {
    create?: XOR<UserCreateWithoutAssignedTasksInput, UserUncheckedCreateWithoutAssignedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutAssignedTasksInput
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutCreatedTasksInput = {
    create?: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedTasksInput
    connect?: UserWhereUniqueInput
  }

  export type BoardSectionCreateNestedOneWithoutTasksInput = {
    create?: XOR<BoardSectionCreateWithoutTasksInput, BoardSectionUncheckedCreateWithoutTasksInput>
    connectOrCreate?: BoardSectionCreateOrConnectWithoutTasksInput
    connect?: BoardSectionWhereUniqueInput
  }

  export type TaskHistoryCreateNestedManyWithoutTaskInput = {
    create?: XOR<TaskHistoryCreateWithoutTaskInput, TaskHistoryUncheckedCreateWithoutTaskInput> | TaskHistoryCreateWithoutTaskInput[] | TaskHistoryUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskHistoryCreateOrConnectWithoutTaskInput | TaskHistoryCreateOrConnectWithoutTaskInput[]
    createMany?: TaskHistoryCreateManyTaskInputEnvelope
    connect?: TaskHistoryWhereUniqueInput | TaskHistoryWhereUniqueInput[]
  }

  export type TaskEmbeddingCreateNestedOneWithoutTaskInput = {
    connect?: TaskEmbeddingWhereUniqueInput
  }

  export type TaskHistoryUncheckedCreateNestedManyWithoutTaskInput = {
    create?: XOR<TaskHistoryCreateWithoutTaskInput, TaskHistoryUncheckedCreateWithoutTaskInput> | TaskHistoryCreateWithoutTaskInput[] | TaskHistoryUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskHistoryCreateOrConnectWithoutTaskInput | TaskHistoryCreateOrConnectWithoutTaskInput[]
    createMany?: TaskHistoryCreateManyTaskInputEnvelope
    connect?: TaskHistoryWhereUniqueInput | TaskHistoryWhereUniqueInput[]
  }

  export type TaskEmbeddingUncheckedCreateNestedOneWithoutTaskInput = {
    connect?: TaskEmbeddingWhereUniqueInput
  }

  export type EnumTaskPriorityFieldUpdateOperationsInput = {
    set?: $Enums.TaskPriority
  }

  export type EnumTaskStatusNewFieldUpdateOperationsInput = {
    set?: $Enums.TaskStatusNew
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneRequiredWithoutAssignedTasksNestedInput = {
    create?: XOR<UserCreateWithoutAssignedTasksInput, UserUncheckedCreateWithoutAssignedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutAssignedTasksInput
    upsert?: UserUpsertWithoutAssignedTasksInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAssignedTasksInput, UserUpdateWithoutAssignedTasksInput>, UserUncheckedUpdateWithoutAssignedTasksInput>
  }

  export type UserUpdateOneRequiredWithoutCreatedTasksNestedInput = {
    create?: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
    connectOrCreate?: UserCreateOrConnectWithoutCreatedTasksInput
    upsert?: UserUpsertWithoutCreatedTasksInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCreatedTasksInput, UserUpdateWithoutCreatedTasksInput>, UserUncheckedUpdateWithoutCreatedTasksInput>
  }

  export type BoardSectionUpdateOneRequiredWithoutTasksNestedInput = {
    create?: XOR<BoardSectionCreateWithoutTasksInput, BoardSectionUncheckedCreateWithoutTasksInput>
    connectOrCreate?: BoardSectionCreateOrConnectWithoutTasksInput
    upsert?: BoardSectionUpsertWithoutTasksInput
    connect?: BoardSectionWhereUniqueInput
    update?: XOR<XOR<BoardSectionUpdateToOneWithWhereWithoutTasksInput, BoardSectionUpdateWithoutTasksInput>, BoardSectionUncheckedUpdateWithoutTasksInput>
  }

  export type TaskHistoryUpdateManyWithoutTaskNestedInput = {
    create?: XOR<TaskHistoryCreateWithoutTaskInput, TaskHistoryUncheckedCreateWithoutTaskInput> | TaskHistoryCreateWithoutTaskInput[] | TaskHistoryUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskHistoryCreateOrConnectWithoutTaskInput | TaskHistoryCreateOrConnectWithoutTaskInput[]
    upsert?: TaskHistoryUpsertWithWhereUniqueWithoutTaskInput | TaskHistoryUpsertWithWhereUniqueWithoutTaskInput[]
    createMany?: TaskHistoryCreateManyTaskInputEnvelope
    set?: TaskHistoryWhereUniqueInput | TaskHistoryWhereUniqueInput[]
    disconnect?: TaskHistoryWhereUniqueInput | TaskHistoryWhereUniqueInput[]
    delete?: TaskHistoryWhereUniqueInput | TaskHistoryWhereUniqueInput[]
    connect?: TaskHistoryWhereUniqueInput | TaskHistoryWhereUniqueInput[]
    update?: TaskHistoryUpdateWithWhereUniqueWithoutTaskInput | TaskHistoryUpdateWithWhereUniqueWithoutTaskInput[]
    updateMany?: TaskHistoryUpdateManyWithWhereWithoutTaskInput | TaskHistoryUpdateManyWithWhereWithoutTaskInput[]
    deleteMany?: TaskHistoryScalarWhereInput | TaskHistoryScalarWhereInput[]
  }

  export type TaskEmbeddingUpdateOneWithoutTaskNestedInput = {
    disconnect?: TaskEmbeddingWhereInput | boolean
    delete?: TaskEmbeddingWhereInput | boolean
    connect?: TaskEmbeddingWhereUniqueInput
    update?: XOR<XOR<TaskEmbeddingUpdateToOneWithWhereWithoutTaskInput, TaskEmbeddingUpdateWithoutTaskInput>, TaskEmbeddingUncheckedUpdateWithoutTaskInput>
  }

  export type TaskHistoryUncheckedUpdateManyWithoutTaskNestedInput = {
    create?: XOR<TaskHistoryCreateWithoutTaskInput, TaskHistoryUncheckedCreateWithoutTaskInput> | TaskHistoryCreateWithoutTaskInput[] | TaskHistoryUncheckedCreateWithoutTaskInput[]
    connectOrCreate?: TaskHistoryCreateOrConnectWithoutTaskInput | TaskHistoryCreateOrConnectWithoutTaskInput[]
    upsert?: TaskHistoryUpsertWithWhereUniqueWithoutTaskInput | TaskHistoryUpsertWithWhereUniqueWithoutTaskInput[]
    createMany?: TaskHistoryCreateManyTaskInputEnvelope
    set?: TaskHistoryWhereUniqueInput | TaskHistoryWhereUniqueInput[]
    disconnect?: TaskHistoryWhereUniqueInput | TaskHistoryWhereUniqueInput[]
    delete?: TaskHistoryWhereUniqueInput | TaskHistoryWhereUniqueInput[]
    connect?: TaskHistoryWhereUniqueInput | TaskHistoryWhereUniqueInput[]
    update?: TaskHistoryUpdateWithWhereUniqueWithoutTaskInput | TaskHistoryUpdateWithWhereUniqueWithoutTaskInput[]
    updateMany?: TaskHistoryUpdateManyWithWhereWithoutTaskInput | TaskHistoryUpdateManyWithWhereWithoutTaskInput[]
    deleteMany?: TaskHistoryScalarWhereInput | TaskHistoryScalarWhereInput[]
  }

  export type TaskEmbeddingUncheckedUpdateOneWithoutTaskNestedInput = {
    disconnect?: TaskEmbeddingWhereInput | boolean
    delete?: TaskEmbeddingWhereInput | boolean
    connect?: TaskEmbeddingWhereUniqueInput
    update?: XOR<XOR<TaskEmbeddingUpdateToOneWithWhereWithoutTaskInput, TaskEmbeddingUpdateWithoutTaskInput>, TaskEmbeddingUncheckedUpdateWithoutTaskInput>
  }

  export type BoardCreateaccessInput = {
    set: string[]
  }

  export type BoardSectionCreateNestedManyWithoutBoardInput = {
    create?: XOR<BoardSectionCreateWithoutBoardInput, BoardSectionUncheckedCreateWithoutBoardInput> | BoardSectionCreateWithoutBoardInput[] | BoardSectionUncheckedCreateWithoutBoardInput[]
    connectOrCreate?: BoardSectionCreateOrConnectWithoutBoardInput | BoardSectionCreateOrConnectWithoutBoardInput[]
    createMany?: BoardSectionCreateManyBoardInputEnvelope
    connect?: BoardSectionWhereUniqueInput | BoardSectionWhereUniqueInput[]
  }

  export type BoardEmbeddingCreateNestedOneWithoutBoardInput = {
    connect?: BoardEmbeddingWhereUniqueInput
  }

  export type BoardSectionUncheckedCreateNestedManyWithoutBoardInput = {
    create?: XOR<BoardSectionCreateWithoutBoardInput, BoardSectionUncheckedCreateWithoutBoardInput> | BoardSectionCreateWithoutBoardInput[] | BoardSectionUncheckedCreateWithoutBoardInput[]
    connectOrCreate?: BoardSectionCreateOrConnectWithoutBoardInput | BoardSectionCreateOrConnectWithoutBoardInput[]
    createMany?: BoardSectionCreateManyBoardInputEnvelope
    connect?: BoardSectionWhereUniqueInput | BoardSectionWhereUniqueInput[]
  }

  export type BoardEmbeddingUncheckedCreateNestedOneWithoutBoardInput = {
    connect?: BoardEmbeddingWhereUniqueInput
  }

  export type BoardUpdateaccessInput = {
    set?: string[]
    push?: string | string[]
  }

  export type BoardSectionUpdateManyWithoutBoardNestedInput = {
    create?: XOR<BoardSectionCreateWithoutBoardInput, BoardSectionUncheckedCreateWithoutBoardInput> | BoardSectionCreateWithoutBoardInput[] | BoardSectionUncheckedCreateWithoutBoardInput[]
    connectOrCreate?: BoardSectionCreateOrConnectWithoutBoardInput | BoardSectionCreateOrConnectWithoutBoardInput[]
    upsert?: BoardSectionUpsertWithWhereUniqueWithoutBoardInput | BoardSectionUpsertWithWhereUniqueWithoutBoardInput[]
    createMany?: BoardSectionCreateManyBoardInputEnvelope
    set?: BoardSectionWhereUniqueInput | BoardSectionWhereUniqueInput[]
    disconnect?: BoardSectionWhereUniqueInput | BoardSectionWhereUniqueInput[]
    delete?: BoardSectionWhereUniqueInput | BoardSectionWhereUniqueInput[]
    connect?: BoardSectionWhereUniqueInput | BoardSectionWhereUniqueInput[]
    update?: BoardSectionUpdateWithWhereUniqueWithoutBoardInput | BoardSectionUpdateWithWhereUniqueWithoutBoardInput[]
    updateMany?: BoardSectionUpdateManyWithWhereWithoutBoardInput | BoardSectionUpdateManyWithWhereWithoutBoardInput[]
    deleteMany?: BoardSectionScalarWhereInput | BoardSectionScalarWhereInput[]
  }

  export type BoardEmbeddingUpdateOneWithoutBoardNestedInput = {
    disconnect?: BoardEmbeddingWhereInput | boolean
    delete?: BoardEmbeddingWhereInput | boolean
    connect?: BoardEmbeddingWhereUniqueInput
    update?: XOR<XOR<BoardEmbeddingUpdateToOneWithWhereWithoutBoardInput, BoardEmbeddingUpdateWithoutBoardInput>, BoardEmbeddingUncheckedUpdateWithoutBoardInput>
  }

  export type BoardSectionUncheckedUpdateManyWithoutBoardNestedInput = {
    create?: XOR<BoardSectionCreateWithoutBoardInput, BoardSectionUncheckedCreateWithoutBoardInput> | BoardSectionCreateWithoutBoardInput[] | BoardSectionUncheckedCreateWithoutBoardInput[]
    connectOrCreate?: BoardSectionCreateOrConnectWithoutBoardInput | BoardSectionCreateOrConnectWithoutBoardInput[]
    upsert?: BoardSectionUpsertWithWhereUniqueWithoutBoardInput | BoardSectionUpsertWithWhereUniqueWithoutBoardInput[]
    createMany?: BoardSectionCreateManyBoardInputEnvelope
    set?: BoardSectionWhereUniqueInput | BoardSectionWhereUniqueInput[]
    disconnect?: BoardSectionWhereUniqueInput | BoardSectionWhereUniqueInput[]
    delete?: BoardSectionWhereUniqueInput | BoardSectionWhereUniqueInput[]
    connect?: BoardSectionWhereUniqueInput | BoardSectionWhereUniqueInput[]
    update?: BoardSectionUpdateWithWhereUniqueWithoutBoardInput | BoardSectionUpdateWithWhereUniqueWithoutBoardInput[]
    updateMany?: BoardSectionUpdateManyWithWhereWithoutBoardInput | BoardSectionUpdateManyWithWhereWithoutBoardInput[]
    deleteMany?: BoardSectionScalarWhereInput | BoardSectionScalarWhereInput[]
  }

  export type BoardEmbeddingUncheckedUpdateOneWithoutBoardNestedInput = {
    disconnect?: BoardEmbeddingWhereInput | boolean
    delete?: BoardEmbeddingWhereInput | boolean
    connect?: BoardEmbeddingWhereUniqueInput
    update?: XOR<XOR<BoardEmbeddingUpdateToOneWithWhereWithoutBoardInput, BoardEmbeddingUpdateWithoutBoardInput>, BoardEmbeddingUncheckedUpdateWithoutBoardInput>
  }

  export type BoardCreateNestedOneWithoutBoardSectionsInput = {
    create?: XOR<BoardCreateWithoutBoardSectionsInput, BoardUncheckedCreateWithoutBoardSectionsInput>
    connectOrCreate?: BoardCreateOrConnectWithoutBoardSectionsInput
    connect?: BoardWhereUniqueInput
  }

  export type TaskCreateNestedManyWithoutBoardSectionInput = {
    create?: XOR<TaskCreateWithoutBoardSectionInput, TaskUncheckedCreateWithoutBoardSectionInput> | TaskCreateWithoutBoardSectionInput[] | TaskUncheckedCreateWithoutBoardSectionInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutBoardSectionInput | TaskCreateOrConnectWithoutBoardSectionInput[]
    createMany?: TaskCreateManyBoardSectionInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type TaskUncheckedCreateNestedManyWithoutBoardSectionInput = {
    create?: XOR<TaskCreateWithoutBoardSectionInput, TaskUncheckedCreateWithoutBoardSectionInput> | TaskCreateWithoutBoardSectionInput[] | TaskUncheckedCreateWithoutBoardSectionInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutBoardSectionInput | TaskCreateOrConnectWithoutBoardSectionInput[]
    createMany?: TaskCreateManyBoardSectionInputEnvelope
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
  }

  export type BoardUpdateOneRequiredWithoutBoardSectionsNestedInput = {
    create?: XOR<BoardCreateWithoutBoardSectionsInput, BoardUncheckedCreateWithoutBoardSectionsInput>
    connectOrCreate?: BoardCreateOrConnectWithoutBoardSectionsInput
    upsert?: BoardUpsertWithoutBoardSectionsInput
    connect?: BoardWhereUniqueInput
    update?: XOR<XOR<BoardUpdateToOneWithWhereWithoutBoardSectionsInput, BoardUpdateWithoutBoardSectionsInput>, BoardUncheckedUpdateWithoutBoardSectionsInput>
  }

  export type TaskUpdateManyWithoutBoardSectionNestedInput = {
    create?: XOR<TaskCreateWithoutBoardSectionInput, TaskUncheckedCreateWithoutBoardSectionInput> | TaskCreateWithoutBoardSectionInput[] | TaskUncheckedCreateWithoutBoardSectionInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutBoardSectionInput | TaskCreateOrConnectWithoutBoardSectionInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutBoardSectionInput | TaskUpsertWithWhereUniqueWithoutBoardSectionInput[]
    createMany?: TaskCreateManyBoardSectionInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutBoardSectionInput | TaskUpdateWithWhereUniqueWithoutBoardSectionInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutBoardSectionInput | TaskUpdateManyWithWhereWithoutBoardSectionInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type TaskUncheckedUpdateManyWithoutBoardSectionNestedInput = {
    create?: XOR<TaskCreateWithoutBoardSectionInput, TaskUncheckedCreateWithoutBoardSectionInput> | TaskCreateWithoutBoardSectionInput[] | TaskUncheckedCreateWithoutBoardSectionInput[]
    connectOrCreate?: TaskCreateOrConnectWithoutBoardSectionInput | TaskCreateOrConnectWithoutBoardSectionInput[]
    upsert?: TaskUpsertWithWhereUniqueWithoutBoardSectionInput | TaskUpsertWithWhereUniqueWithoutBoardSectionInput[]
    createMany?: TaskCreateManyBoardSectionInputEnvelope
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[]
    update?: TaskUpdateWithWhereUniqueWithoutBoardSectionInput | TaskUpdateWithWhereUniqueWithoutBoardSectionInput[]
    updateMany?: TaskUpdateManyWithWhereWithoutBoardSectionInput | TaskUpdateManyWithWhereWithoutBoardSectionInput[]
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[]
  }

  export type TaskCreateNestedOneWithoutHistoryInput = {
    create?: XOR<TaskCreateWithoutHistoryInput, TaskUncheckedCreateWithoutHistoryInput>
    connectOrCreate?: TaskCreateOrConnectWithoutHistoryInput
    connect?: TaskWhereUniqueInput
  }

  export type TaskUpdateOneRequiredWithoutHistoryNestedInput = {
    create?: XOR<TaskCreateWithoutHistoryInput, TaskUncheckedCreateWithoutHistoryInput>
    connectOrCreate?: TaskCreateOrConnectWithoutHistoryInput
    upsert?: TaskUpsertWithoutHistoryInput
    connect?: TaskWhereUniqueInput
    update?: XOR<XOR<TaskUpdateToOneWithWhereWithoutHistoryInput, TaskUpdateWithoutHistoryInput>, TaskUncheckedUpdateWithoutHistoryInput>
  }

  export type TaskUpdateOneRequiredWithoutEmbeddingNestedInput = {
    create?: XOR<TaskCreateWithoutEmbeddingInput, TaskUncheckedCreateWithoutEmbeddingInput>
    connectOrCreate?: TaskCreateOrConnectWithoutEmbeddingInput
    upsert?: TaskUpsertWithoutEmbeddingInput
    connect?: TaskWhereUniqueInput
    update?: XOR<XOR<TaskUpdateToOneWithWhereWithoutEmbeddingInput, TaskUpdateWithoutEmbeddingInput>, TaskUncheckedUpdateWithoutEmbeddingInput>
  }

  export type BoardUpdateOneRequiredWithoutEmbeddingNestedInput = {
    create?: XOR<BoardCreateWithoutEmbeddingInput, BoardUncheckedCreateWithoutEmbeddingInput>
    connectOrCreate?: BoardCreateOrConnectWithoutEmbeddingInput
    upsert?: BoardUpsertWithoutEmbeddingInput
    connect?: BoardWhereUniqueInput
    update?: XOR<XOR<BoardUpdateToOneWithWhereWithoutEmbeddingInput, BoardUpdateWithoutEmbeddingInput>, BoardUncheckedUpdateWithoutEmbeddingInput>
  }

  export type AIMessageCreateNestedManyWithoutConversationInput = {
    create?: XOR<AIMessageCreateWithoutConversationInput, AIMessageUncheckedCreateWithoutConversationInput> | AIMessageCreateWithoutConversationInput[] | AIMessageUncheckedCreateWithoutConversationInput[]
    connectOrCreate?: AIMessageCreateOrConnectWithoutConversationInput | AIMessageCreateOrConnectWithoutConversationInput[]
    createMany?: AIMessageCreateManyConversationInputEnvelope
    connect?: AIMessageWhereUniqueInput | AIMessageWhereUniqueInput[]
  }

  export type UserCreateNestedOneWithoutAiConversationsInput = {
    create?: XOR<UserCreateWithoutAiConversationsInput, UserUncheckedCreateWithoutAiConversationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAiConversationsInput
    connect?: UserWhereUniqueInput
  }

  export type AIMessageUncheckedCreateNestedManyWithoutConversationInput = {
    create?: XOR<AIMessageCreateWithoutConversationInput, AIMessageUncheckedCreateWithoutConversationInput> | AIMessageCreateWithoutConversationInput[] | AIMessageUncheckedCreateWithoutConversationInput[]
    connectOrCreate?: AIMessageCreateOrConnectWithoutConversationInput | AIMessageCreateOrConnectWithoutConversationInput[]
    createMany?: AIMessageCreateManyConversationInputEnvelope
    connect?: AIMessageWhereUniqueInput | AIMessageWhereUniqueInput[]
  }

  export type AIMessageUpdateManyWithoutConversationNestedInput = {
    create?: XOR<AIMessageCreateWithoutConversationInput, AIMessageUncheckedCreateWithoutConversationInput> | AIMessageCreateWithoutConversationInput[] | AIMessageUncheckedCreateWithoutConversationInput[]
    connectOrCreate?: AIMessageCreateOrConnectWithoutConversationInput | AIMessageCreateOrConnectWithoutConversationInput[]
    upsert?: AIMessageUpsertWithWhereUniqueWithoutConversationInput | AIMessageUpsertWithWhereUniqueWithoutConversationInput[]
    createMany?: AIMessageCreateManyConversationInputEnvelope
    set?: AIMessageWhereUniqueInput | AIMessageWhereUniqueInput[]
    disconnect?: AIMessageWhereUniqueInput | AIMessageWhereUniqueInput[]
    delete?: AIMessageWhereUniqueInput | AIMessageWhereUniqueInput[]
    connect?: AIMessageWhereUniqueInput | AIMessageWhereUniqueInput[]
    update?: AIMessageUpdateWithWhereUniqueWithoutConversationInput | AIMessageUpdateWithWhereUniqueWithoutConversationInput[]
    updateMany?: AIMessageUpdateManyWithWhereWithoutConversationInput | AIMessageUpdateManyWithWhereWithoutConversationInput[]
    deleteMany?: AIMessageScalarWhereInput | AIMessageScalarWhereInput[]
  }

  export type UserUpdateOneRequiredWithoutAiConversationsNestedInput = {
    create?: XOR<UserCreateWithoutAiConversationsInput, UserUncheckedCreateWithoutAiConversationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAiConversationsInput
    upsert?: UserUpsertWithoutAiConversationsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAiConversationsInput, UserUpdateWithoutAiConversationsInput>, UserUncheckedUpdateWithoutAiConversationsInput>
  }

  export type AIMessageUncheckedUpdateManyWithoutConversationNestedInput = {
    create?: XOR<AIMessageCreateWithoutConversationInput, AIMessageUncheckedCreateWithoutConversationInput> | AIMessageCreateWithoutConversationInput[] | AIMessageUncheckedCreateWithoutConversationInput[]
    connectOrCreate?: AIMessageCreateOrConnectWithoutConversationInput | AIMessageCreateOrConnectWithoutConversationInput[]
    upsert?: AIMessageUpsertWithWhereUniqueWithoutConversationInput | AIMessageUpsertWithWhereUniqueWithoutConversationInput[]
    createMany?: AIMessageCreateManyConversationInputEnvelope
    set?: AIMessageWhereUniqueInput | AIMessageWhereUniqueInput[]
    disconnect?: AIMessageWhereUniqueInput | AIMessageWhereUniqueInput[]
    delete?: AIMessageWhereUniqueInput | AIMessageWhereUniqueInput[]
    connect?: AIMessageWhereUniqueInput | AIMessageWhereUniqueInput[]
    update?: AIMessageUpdateWithWhereUniqueWithoutConversationInput | AIMessageUpdateWithWhereUniqueWithoutConversationInput[]
    updateMany?: AIMessageUpdateManyWithWhereWithoutConversationInput | AIMessageUpdateManyWithWhereWithoutConversationInput[]
    deleteMany?: AIMessageScalarWhereInput | AIMessageScalarWhereInput[]
  }

  export type AIConversationCreateNestedOneWithoutMessagesInput = {
    create?: XOR<AIConversationCreateWithoutMessagesInput, AIConversationUncheckedCreateWithoutMessagesInput>
    connectOrCreate?: AIConversationCreateOrConnectWithoutMessagesInput
    connect?: AIConversationWhereUniqueInput
  }

  export type AIConversationUpdateOneRequiredWithoutMessagesNestedInput = {
    create?: XOR<AIConversationCreateWithoutMessagesInput, AIConversationUncheckedCreateWithoutMessagesInput>
    connectOrCreate?: AIConversationCreateOrConnectWithoutMessagesInput
    upsert?: AIConversationUpsertWithoutMessagesInput
    connect?: AIConversationWhereUniqueInput
    update?: XOR<XOR<AIConversationUpdateToOneWithWhereWithoutMessagesInput, AIConversationUpdateWithoutMessagesInput>, AIConversationUncheckedUpdateWithoutMessagesInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type NestedEnumTaskPriorityFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskPriority | EnumTaskPriorityFieldRefInput<$PrismaModel>
    in?: $Enums.TaskPriority[] | ListEnumTaskPriorityFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskPriority[] | ListEnumTaskPriorityFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskPriorityFilter<$PrismaModel> | $Enums.TaskPriority
  }

  export type NestedEnumTaskStatusNewFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatusNew | EnumTaskStatusNewFieldRefInput<$PrismaModel>
    in?: $Enums.TaskStatusNew[] | ListEnumTaskStatusNewFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskStatusNew[] | ListEnumTaskStatusNewFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskStatusNewFilter<$PrismaModel> | $Enums.TaskStatusNew
  }

  export type NestedEnumTaskPriorityWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskPriority | EnumTaskPriorityFieldRefInput<$PrismaModel>
    in?: $Enums.TaskPriority[] | ListEnumTaskPriorityFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskPriority[] | ListEnumTaskPriorityFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskPriorityWithAggregatesFilter<$PrismaModel> | $Enums.TaskPriority
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTaskPriorityFilter<$PrismaModel>
    _max?: NestedEnumTaskPriorityFilter<$PrismaModel>
  }

  export type NestedEnumTaskStatusNewWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatusNew | EnumTaskStatusNewFieldRefInput<$PrismaModel>
    in?: $Enums.TaskStatusNew[] | ListEnumTaskStatusNewFieldRefInput<$PrismaModel>
    notIn?: $Enums.TaskStatusNew[] | ListEnumTaskStatusNewFieldRefInput<$PrismaModel>
    not?: NestedEnumTaskStatusNewWithAggregatesFilter<$PrismaModel> | $Enums.TaskStatusNew
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTaskStatusNewFilter<$PrismaModel>
    _max?: NestedEnumTaskStatusNewFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type UserCreateWithoutAccountsInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    sessions?: SessionCreateNestedManyWithoutUserInput
    assignedTasks?: TaskCreateNestedManyWithoutAssignedToInput
    createdTasks?: TaskCreateNestedManyWithoutCreatedByInput
    aiConversations?: AIConversationCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAccountsInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssignedToInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatedByInput
    aiConversations?: AIConversationUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAccountsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
  }

  export type UserUpsertWithoutAccountsInput = {
    update: XOR<UserUpdateWithoutAccountsInput, UserUncheckedUpdateWithoutAccountsInput>
    create: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAccountsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAccountsInput, UserUncheckedUpdateWithoutAccountsInput>
  }

  export type UserUpdateWithoutAccountsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    sessions?: SessionUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssignedToNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatedByNestedInput
    aiConversations?: AIConversationUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAccountsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssignedToNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatedByNestedInput
    aiConversations?: AIConversationUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutSessionsInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    accounts?: AccountCreateNestedManyWithoutUserInput
    assignedTasks?: TaskCreateNestedManyWithoutAssignedToInput
    createdTasks?: TaskCreateNestedManyWithoutCreatedByInput
    aiConversations?: AIConversationCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSessionsInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssignedToInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatedByInput
    aiConversations?: AIConversationUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSessionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
  }

  export type UserUpsertWithoutSessionsInput = {
    update: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSessionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type UserUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    accounts?: AccountUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssignedToNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatedByNestedInput
    aiConversations?: AIConversationUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssignedToNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatedByNestedInput
    aiConversations?: AIConversationUncheckedUpdateManyWithoutUserNestedInput
  }

  export type AccountCreateWithoutUserInput = {
    id?: string
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
  }

  export type AccountUncheckedCreateWithoutUserInput = {
    id?: string
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
  }

  export type AccountCreateOrConnectWithoutUserInput = {
    where: AccountWhereUniqueInput
    create: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput>
  }

  export type AccountCreateManyUserInputEnvelope = {
    data: AccountCreateManyUserInput | AccountCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type SessionCreateWithoutUserInput = {
    id?: string
    sessionToken: string
    expires: Date | string
  }

  export type SessionUncheckedCreateWithoutUserInput = {
    id?: string
    sessionToken: string
    expires: Date | string
  }

  export type SessionCreateOrConnectWithoutUserInput = {
    where: SessionWhereUniqueInput
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionCreateManyUserInputEnvelope = {
    data: SessionCreateManyUserInput | SessionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type TaskCreateWithoutAssignedToInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    createdBy: UserCreateNestedOneWithoutCreatedTasksInput
    boardSection: BoardSectionCreateNestedOneWithoutTasksInput
    history?: TaskHistoryCreateNestedManyWithoutTaskInput
    embedding?: TaskEmbeddingCreateNestedOneWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutAssignedToInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    createdById: string
    boardSectionId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    history?: TaskHistoryUncheckedCreateNestedManyWithoutTaskInput
    embedding?: TaskEmbeddingUncheckedCreateNestedOneWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutAssignedToInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutAssignedToInput, TaskUncheckedCreateWithoutAssignedToInput>
  }

  export type TaskCreateManyAssignedToInputEnvelope = {
    data: TaskCreateManyAssignedToInput | TaskCreateManyAssignedToInput[]
    skipDuplicates?: boolean
  }

  export type TaskCreateWithoutCreatedByInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    assignedTo: UserCreateNestedOneWithoutAssignedTasksInput
    boardSection: BoardSectionCreateNestedOneWithoutTasksInput
    history?: TaskHistoryCreateNestedManyWithoutTaskInput
    embedding?: TaskEmbeddingCreateNestedOneWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutCreatedByInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    assignedToId: string
    boardSectionId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    history?: TaskHistoryUncheckedCreateNestedManyWithoutTaskInput
    embedding?: TaskEmbeddingUncheckedCreateNestedOneWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutCreatedByInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutCreatedByInput, TaskUncheckedCreateWithoutCreatedByInput>
  }

  export type TaskCreateManyCreatedByInputEnvelope = {
    data: TaskCreateManyCreatedByInput | TaskCreateManyCreatedByInput[]
    skipDuplicates?: boolean
  }

  export type AIConversationCreateWithoutUserInput = {
    id?: string
    companyId: string
    title?: string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    messages?: AIMessageCreateNestedManyWithoutConversationInput
  }

  export type AIConversationUncheckedCreateWithoutUserInput = {
    id?: string
    companyId: string
    title?: string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    messages?: AIMessageUncheckedCreateNestedManyWithoutConversationInput
  }

  export type AIConversationCreateOrConnectWithoutUserInput = {
    where: AIConversationWhereUniqueInput
    create: XOR<AIConversationCreateWithoutUserInput, AIConversationUncheckedCreateWithoutUserInput>
  }

  export type AIConversationCreateManyUserInputEnvelope = {
    data: AIConversationCreateManyUserInput | AIConversationCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type AccountUpsertWithWhereUniqueWithoutUserInput = {
    where: AccountWhereUniqueInput
    update: XOR<AccountUpdateWithoutUserInput, AccountUncheckedUpdateWithoutUserInput>
    create: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput>
  }

  export type AccountUpdateWithWhereUniqueWithoutUserInput = {
    where: AccountWhereUniqueInput
    data: XOR<AccountUpdateWithoutUserInput, AccountUncheckedUpdateWithoutUserInput>
  }

  export type AccountUpdateManyWithWhereWithoutUserInput = {
    where: AccountScalarWhereInput
    data: XOR<AccountUpdateManyMutationInput, AccountUncheckedUpdateManyWithoutUserInput>
  }

  export type AccountScalarWhereInput = {
    AND?: AccountScalarWhereInput | AccountScalarWhereInput[]
    OR?: AccountScalarWhereInput[]
    NOT?: AccountScalarWhereInput | AccountScalarWhereInput[]
    id?: StringFilter<"Account"> | string
    userId?: StringFilter<"Account"> | string
    type?: StringFilter<"Account"> | string
    provider?: StringFilter<"Account"> | string
    providerAccountId?: StringFilter<"Account"> | string
    refresh_token?: StringNullableFilter<"Account"> | string | null
    access_token?: StringNullableFilter<"Account"> | string | null
    expires_at?: IntNullableFilter<"Account"> | number | null
    token_type?: StringNullableFilter<"Account"> | string | null
    scope?: StringNullableFilter<"Account"> | string | null
    id_token?: StringNullableFilter<"Account"> | string | null
    session_state?: StringNullableFilter<"Account"> | string | null
  }

  export type SessionUpsertWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    update: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionUpdateWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    data: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
  }

  export type SessionUpdateManyWithWhereWithoutUserInput = {
    where: SessionScalarWhereInput
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyWithoutUserInput>
  }

  export type SessionScalarWhereInput = {
    AND?: SessionScalarWhereInput | SessionScalarWhereInput[]
    OR?: SessionScalarWhereInput[]
    NOT?: SessionScalarWhereInput | SessionScalarWhereInput[]
    id?: StringFilter<"Session"> | string
    sessionToken?: StringFilter<"Session"> | string
    userId?: StringFilter<"Session"> | string
    expires?: DateTimeFilter<"Session"> | Date | string
  }

  export type TaskUpsertWithWhereUniqueWithoutAssignedToInput = {
    where: TaskWhereUniqueInput
    update: XOR<TaskUpdateWithoutAssignedToInput, TaskUncheckedUpdateWithoutAssignedToInput>
    create: XOR<TaskCreateWithoutAssignedToInput, TaskUncheckedCreateWithoutAssignedToInput>
  }

  export type TaskUpdateWithWhereUniqueWithoutAssignedToInput = {
    where: TaskWhereUniqueInput
    data: XOR<TaskUpdateWithoutAssignedToInput, TaskUncheckedUpdateWithoutAssignedToInput>
  }

  export type TaskUpdateManyWithWhereWithoutAssignedToInput = {
    where: TaskScalarWhereInput
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyWithoutAssignedToInput>
  }

  export type TaskScalarWhereInput = {
    AND?: TaskScalarWhereInput | TaskScalarWhereInput[]
    OR?: TaskScalarWhereInput[]
    NOT?: TaskScalarWhereInput | TaskScalarWhereInput[]
    id?: StringFilter<"Task"> | string
    title?: StringFilter<"Task"> | string
    description?: StringFilter<"Task"> | string
    priority?: EnumTaskPriorityFilter<"Task"> | $Enums.TaskPriority
    status?: EnumTaskStatusNewFilter<"Task"> | $Enums.TaskStatusNew
    dueDate?: DateTimeFilter<"Task"> | Date | string
    position?: IntFilter<"Task"> | number
    assignedToId?: StringFilter<"Task"> | string
    createdById?: StringFilter<"Task"> | string
    boardSectionId?: StringFilter<"Task"> | string
    createdAt?: DateTimeFilter<"Task"> | Date | string
    updatedAt?: DateTimeFilter<"Task"> | Date | string
  }

  export type TaskUpsertWithWhereUniqueWithoutCreatedByInput = {
    where: TaskWhereUniqueInput
    update: XOR<TaskUpdateWithoutCreatedByInput, TaskUncheckedUpdateWithoutCreatedByInput>
    create: XOR<TaskCreateWithoutCreatedByInput, TaskUncheckedCreateWithoutCreatedByInput>
  }

  export type TaskUpdateWithWhereUniqueWithoutCreatedByInput = {
    where: TaskWhereUniqueInput
    data: XOR<TaskUpdateWithoutCreatedByInput, TaskUncheckedUpdateWithoutCreatedByInput>
  }

  export type TaskUpdateManyWithWhereWithoutCreatedByInput = {
    where: TaskScalarWhereInput
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyWithoutCreatedByInput>
  }

  export type AIConversationUpsertWithWhereUniqueWithoutUserInput = {
    where: AIConversationWhereUniqueInput
    update: XOR<AIConversationUpdateWithoutUserInput, AIConversationUncheckedUpdateWithoutUserInput>
    create: XOR<AIConversationCreateWithoutUserInput, AIConversationUncheckedCreateWithoutUserInput>
  }

  export type AIConversationUpdateWithWhereUniqueWithoutUserInput = {
    where: AIConversationWhereUniqueInput
    data: XOR<AIConversationUpdateWithoutUserInput, AIConversationUncheckedUpdateWithoutUserInput>
  }

  export type AIConversationUpdateManyWithWhereWithoutUserInput = {
    where: AIConversationScalarWhereInput
    data: XOR<AIConversationUpdateManyMutationInput, AIConversationUncheckedUpdateManyWithoutUserInput>
  }

  export type AIConversationScalarWhereInput = {
    AND?: AIConversationScalarWhereInput | AIConversationScalarWhereInput[]
    OR?: AIConversationScalarWhereInput[]
    NOT?: AIConversationScalarWhereInput | AIConversationScalarWhereInput[]
    id?: StringFilter<"AIConversation"> | string
    userId?: StringFilter<"AIConversation"> | string
    companyId?: StringFilter<"AIConversation"> | string
    title?: StringNullableFilter<"AIConversation"> | string | null
    context?: JsonNullableFilter<"AIConversation">
    createdAt?: DateTimeFilter<"AIConversation"> | Date | string
    updatedAt?: DateTimeFilter<"AIConversation"> | Date | string
  }

  export type UserCreateWithoutAssignedTasksInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    accounts?: AccountCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    createdTasks?: TaskCreateNestedManyWithoutCreatedByInput
    aiConversations?: AIConversationCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAssignedTasksInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatedByInput
    aiConversations?: AIConversationUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAssignedTasksInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAssignedTasksInput, UserUncheckedCreateWithoutAssignedTasksInput>
  }

  export type UserCreateWithoutCreatedTasksInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    accounts?: AccountCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    assignedTasks?: TaskCreateNestedManyWithoutAssignedToInput
    aiConversations?: AIConversationCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutCreatedTasksInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssignedToInput
    aiConversations?: AIConversationUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutCreatedTasksInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
  }

  export type BoardSectionCreateWithoutTasksInput = {
    id?: string
    name: string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    board: BoardCreateNestedOneWithoutBoardSectionsInput
  }

  export type BoardSectionUncheckedCreateWithoutTasksInput = {
    id?: string
    name: string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    boardId: string
  }

  export type BoardSectionCreateOrConnectWithoutTasksInput = {
    where: BoardSectionWhereUniqueInput
    create: XOR<BoardSectionCreateWithoutTasksInput, BoardSectionUncheckedCreateWithoutTasksInput>
  }

  export type TaskHistoryCreateWithoutTaskInput = {
    id?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    description?: string | null
  }

  export type TaskHistoryUncheckedCreateWithoutTaskInput = {
    id?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    description?: string | null
  }

  export type TaskHistoryCreateOrConnectWithoutTaskInput = {
    where: TaskHistoryWhereUniqueInput
    create: XOR<TaskHistoryCreateWithoutTaskInput, TaskHistoryUncheckedCreateWithoutTaskInput>
  }

  export type TaskHistoryCreateManyTaskInputEnvelope = {
    data: TaskHistoryCreateManyTaskInput | TaskHistoryCreateManyTaskInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutAssignedTasksInput = {
    update: XOR<UserUpdateWithoutAssignedTasksInput, UserUncheckedUpdateWithoutAssignedTasksInput>
    create: XOR<UserCreateWithoutAssignedTasksInput, UserUncheckedCreateWithoutAssignedTasksInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAssignedTasksInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAssignedTasksInput, UserUncheckedUpdateWithoutAssignedTasksInput>
  }

  export type UserUpdateWithoutAssignedTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    accounts?: AccountUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatedByNestedInput
    aiConversations?: AIConversationUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAssignedTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatedByNestedInput
    aiConversations?: AIConversationUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserUpsertWithoutCreatedTasksInput = {
    update: XOR<UserUpdateWithoutCreatedTasksInput, UserUncheckedUpdateWithoutCreatedTasksInput>
    create: XOR<UserCreateWithoutCreatedTasksInput, UserUncheckedCreateWithoutCreatedTasksInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCreatedTasksInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCreatedTasksInput, UserUncheckedUpdateWithoutCreatedTasksInput>
  }

  export type UserUpdateWithoutCreatedTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    accounts?: AccountUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssignedToNestedInput
    aiConversations?: AIConversationUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutCreatedTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssignedToNestedInput
    aiConversations?: AIConversationUncheckedUpdateManyWithoutUserNestedInput
  }

  export type BoardSectionUpsertWithoutTasksInput = {
    update: XOR<BoardSectionUpdateWithoutTasksInput, BoardSectionUncheckedUpdateWithoutTasksInput>
    create: XOR<BoardSectionCreateWithoutTasksInput, BoardSectionUncheckedCreateWithoutTasksInput>
    where?: BoardSectionWhereInput
  }

  export type BoardSectionUpdateToOneWithWhereWithoutTasksInput = {
    where?: BoardSectionWhereInput
    data: XOR<BoardSectionUpdateWithoutTasksInput, BoardSectionUncheckedUpdateWithoutTasksInput>
  }

  export type BoardSectionUpdateWithoutTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    board?: BoardUpdateOneRequiredWithoutBoardSectionsNestedInput
  }

  export type BoardSectionUncheckedUpdateWithoutTasksInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    boardId?: StringFieldUpdateOperationsInput | string
  }

  export type TaskHistoryUpsertWithWhereUniqueWithoutTaskInput = {
    where: TaskHistoryWhereUniqueInput
    update: XOR<TaskHistoryUpdateWithoutTaskInput, TaskHistoryUncheckedUpdateWithoutTaskInput>
    create: XOR<TaskHistoryCreateWithoutTaskInput, TaskHistoryUncheckedCreateWithoutTaskInput>
  }

  export type TaskHistoryUpdateWithWhereUniqueWithoutTaskInput = {
    where: TaskHistoryWhereUniqueInput
    data: XOR<TaskHistoryUpdateWithoutTaskInput, TaskHistoryUncheckedUpdateWithoutTaskInput>
  }

  export type TaskHistoryUpdateManyWithWhereWithoutTaskInput = {
    where: TaskHistoryScalarWhereInput
    data: XOR<TaskHistoryUpdateManyMutationInput, TaskHistoryUncheckedUpdateManyWithoutTaskInput>
  }

  export type TaskHistoryScalarWhereInput = {
    AND?: TaskHistoryScalarWhereInput | TaskHistoryScalarWhereInput[]
    OR?: TaskHistoryScalarWhereInput[]
    NOT?: TaskHistoryScalarWhereInput | TaskHistoryScalarWhereInput[]
    id?: StringFilter<"TaskHistory"> | string
    taskId?: StringFilter<"TaskHistory"> | string
    createdAt?: DateTimeFilter<"TaskHistory"> | Date | string
    updatedAt?: DateTimeFilter<"TaskHistory"> | Date | string
    description?: StringNullableFilter<"TaskHistory"> | string | null
  }

  export type TaskEmbeddingUpdateToOneWithWhereWithoutTaskInput = {
    where?: TaskEmbeddingWhereInput
    data: XOR<TaskEmbeddingUpdateWithoutTaskInput, TaskEmbeddingUncheckedUpdateWithoutTaskInput>
  }

  export type TaskEmbeddingUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskEmbeddingUncheckedUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BoardSectionCreateWithoutBoardInput = {
    id?: string
    name: string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    tasks?: TaskCreateNestedManyWithoutBoardSectionInput
  }

  export type BoardSectionUncheckedCreateWithoutBoardInput = {
    id?: string
    name: string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    tasks?: TaskUncheckedCreateNestedManyWithoutBoardSectionInput
  }

  export type BoardSectionCreateOrConnectWithoutBoardInput = {
    where: BoardSectionWhereUniqueInput
    create: XOR<BoardSectionCreateWithoutBoardInput, BoardSectionUncheckedCreateWithoutBoardInput>
  }

  export type BoardSectionCreateManyBoardInputEnvelope = {
    data: BoardSectionCreateManyBoardInput | BoardSectionCreateManyBoardInput[]
    skipDuplicates?: boolean
  }

  export type BoardSectionUpsertWithWhereUniqueWithoutBoardInput = {
    where: BoardSectionWhereUniqueInput
    update: XOR<BoardSectionUpdateWithoutBoardInput, BoardSectionUncheckedUpdateWithoutBoardInput>
    create: XOR<BoardSectionCreateWithoutBoardInput, BoardSectionUncheckedCreateWithoutBoardInput>
  }

  export type BoardSectionUpdateWithWhereUniqueWithoutBoardInput = {
    where: BoardSectionWhereUniqueInput
    data: XOR<BoardSectionUpdateWithoutBoardInput, BoardSectionUncheckedUpdateWithoutBoardInput>
  }

  export type BoardSectionUpdateManyWithWhereWithoutBoardInput = {
    where: BoardSectionScalarWhereInput
    data: XOR<BoardSectionUpdateManyMutationInput, BoardSectionUncheckedUpdateManyWithoutBoardInput>
  }

  export type BoardSectionScalarWhereInput = {
    AND?: BoardSectionScalarWhereInput | BoardSectionScalarWhereInput[]
    OR?: BoardSectionScalarWhereInput[]
    NOT?: BoardSectionScalarWhereInput | BoardSectionScalarWhereInput[]
    id?: StringFilter<"BoardSection"> | string
    name?: StringFilter<"BoardSection"> | string
    position?: IntFilter<"BoardSection"> | number
    createdAt?: DateTimeFilter<"BoardSection"> | Date | string
    updatedAt?: DateTimeFilter<"BoardSection"> | Date | string
    boardId?: StringFilter<"BoardSection"> | string
  }

  export type BoardEmbeddingUpdateToOneWithWhereWithoutBoardInput = {
    where?: BoardEmbeddingWhereInput
    data: XOR<BoardEmbeddingUpdateWithoutBoardInput, BoardEmbeddingUncheckedUpdateWithoutBoardInput>
  }

  export type BoardEmbeddingUpdateWithoutBoardInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BoardEmbeddingUncheckedUpdateWithoutBoardInput = {
    id?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BoardCreateWithoutBoardSectionsInput = {
    id?: string
    name: string
    description?: string | null
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    access?: BoardCreateaccessInput | string[]
    embedding?: BoardEmbeddingCreateNestedOneWithoutBoardInput
  }

  export type BoardUncheckedCreateWithoutBoardSectionsInput = {
    id?: string
    name: string
    description?: string | null
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    access?: BoardCreateaccessInput | string[]
    embedding?: BoardEmbeddingUncheckedCreateNestedOneWithoutBoardInput
  }

  export type BoardCreateOrConnectWithoutBoardSectionsInput = {
    where: BoardWhereUniqueInput
    create: XOR<BoardCreateWithoutBoardSectionsInput, BoardUncheckedCreateWithoutBoardSectionsInput>
  }

  export type TaskCreateWithoutBoardSectionInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    assignedTo: UserCreateNestedOneWithoutAssignedTasksInput
    createdBy: UserCreateNestedOneWithoutCreatedTasksInput
    history?: TaskHistoryCreateNestedManyWithoutTaskInput
    embedding?: TaskEmbeddingCreateNestedOneWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutBoardSectionInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    assignedToId: string
    createdById: string
    createdAt?: Date | string
    updatedAt?: Date | string
    history?: TaskHistoryUncheckedCreateNestedManyWithoutTaskInput
    embedding?: TaskEmbeddingUncheckedCreateNestedOneWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutBoardSectionInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutBoardSectionInput, TaskUncheckedCreateWithoutBoardSectionInput>
  }

  export type TaskCreateManyBoardSectionInputEnvelope = {
    data: TaskCreateManyBoardSectionInput | TaskCreateManyBoardSectionInput[]
    skipDuplicates?: boolean
  }

  export type BoardUpsertWithoutBoardSectionsInput = {
    update: XOR<BoardUpdateWithoutBoardSectionsInput, BoardUncheckedUpdateWithoutBoardSectionsInput>
    create: XOR<BoardCreateWithoutBoardSectionsInput, BoardUncheckedCreateWithoutBoardSectionsInput>
    where?: BoardWhereInput
  }

  export type BoardUpdateToOneWithWhereWithoutBoardSectionsInput = {
    where?: BoardWhereInput
    data: XOR<BoardUpdateWithoutBoardSectionsInput, BoardUncheckedUpdateWithoutBoardSectionsInput>
  }

  export type BoardUpdateWithoutBoardSectionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    access?: BoardUpdateaccessInput | string[]
    embedding?: BoardEmbeddingUpdateOneWithoutBoardNestedInput
  }

  export type BoardUncheckedUpdateWithoutBoardSectionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    access?: BoardUpdateaccessInput | string[]
    embedding?: BoardEmbeddingUncheckedUpdateOneWithoutBoardNestedInput
  }

  export type TaskUpsertWithWhereUniqueWithoutBoardSectionInput = {
    where: TaskWhereUniqueInput
    update: XOR<TaskUpdateWithoutBoardSectionInput, TaskUncheckedUpdateWithoutBoardSectionInput>
    create: XOR<TaskCreateWithoutBoardSectionInput, TaskUncheckedCreateWithoutBoardSectionInput>
  }

  export type TaskUpdateWithWhereUniqueWithoutBoardSectionInput = {
    where: TaskWhereUniqueInput
    data: XOR<TaskUpdateWithoutBoardSectionInput, TaskUncheckedUpdateWithoutBoardSectionInput>
  }

  export type TaskUpdateManyWithWhereWithoutBoardSectionInput = {
    where: TaskScalarWhereInput
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyWithoutBoardSectionInput>
  }

  export type TaskCreateWithoutHistoryInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    assignedTo: UserCreateNestedOneWithoutAssignedTasksInput
    createdBy: UserCreateNestedOneWithoutCreatedTasksInput
    boardSection: BoardSectionCreateNestedOneWithoutTasksInput
    embedding?: TaskEmbeddingCreateNestedOneWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutHistoryInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    assignedToId: string
    createdById: string
    boardSectionId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    embedding?: TaskEmbeddingUncheckedCreateNestedOneWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutHistoryInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutHistoryInput, TaskUncheckedCreateWithoutHistoryInput>
  }

  export type TaskUpsertWithoutHistoryInput = {
    update: XOR<TaskUpdateWithoutHistoryInput, TaskUncheckedUpdateWithoutHistoryInput>
    create: XOR<TaskCreateWithoutHistoryInput, TaskUncheckedCreateWithoutHistoryInput>
    where?: TaskWhereInput
  }

  export type TaskUpdateToOneWithWhereWithoutHistoryInput = {
    where?: TaskWhereInput
    data: XOR<TaskUpdateWithoutHistoryInput, TaskUncheckedUpdateWithoutHistoryInput>
  }

  export type TaskUpdateWithoutHistoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignedTo?: UserUpdateOneRequiredWithoutAssignedTasksNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    boardSection?: BoardSectionUpdateOneRequiredWithoutTasksNestedInput
    embedding?: TaskEmbeddingUpdateOneWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutHistoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    assignedToId?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    boardSectionId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    embedding?: TaskEmbeddingUncheckedUpdateOneWithoutTaskNestedInput
  }

  export type TaskCreateWithoutEmbeddingInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    assignedTo: UserCreateNestedOneWithoutAssignedTasksInput
    createdBy: UserCreateNestedOneWithoutCreatedTasksInput
    boardSection: BoardSectionCreateNestedOneWithoutTasksInput
    history?: TaskHistoryCreateNestedManyWithoutTaskInput
  }

  export type TaskUncheckedCreateWithoutEmbeddingInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    assignedToId: string
    createdById: string
    boardSectionId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    history?: TaskHistoryUncheckedCreateNestedManyWithoutTaskInput
  }

  export type TaskCreateOrConnectWithoutEmbeddingInput = {
    where: TaskWhereUniqueInput
    create: XOR<TaskCreateWithoutEmbeddingInput, TaskUncheckedCreateWithoutEmbeddingInput>
  }

  export type TaskUpsertWithoutEmbeddingInput = {
    update: XOR<TaskUpdateWithoutEmbeddingInput, TaskUncheckedUpdateWithoutEmbeddingInput>
    create: XOR<TaskCreateWithoutEmbeddingInput, TaskUncheckedCreateWithoutEmbeddingInput>
    where?: TaskWhereInput
  }

  export type TaskUpdateToOneWithWhereWithoutEmbeddingInput = {
    where?: TaskWhereInput
    data: XOR<TaskUpdateWithoutEmbeddingInput, TaskUncheckedUpdateWithoutEmbeddingInput>
  }

  export type TaskUpdateWithoutEmbeddingInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignedTo?: UserUpdateOneRequiredWithoutAssignedTasksNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    boardSection?: BoardSectionUpdateOneRequiredWithoutTasksNestedInput
    history?: TaskHistoryUpdateManyWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutEmbeddingInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    assignedToId?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    boardSectionId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    history?: TaskHistoryUncheckedUpdateManyWithoutTaskNestedInput
  }

  export type BoardCreateWithoutEmbeddingInput = {
    id?: string
    name: string
    description?: string | null
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    access?: BoardCreateaccessInput | string[]
    boardSections?: BoardSectionCreateNestedManyWithoutBoardInput
  }

  export type BoardUncheckedCreateWithoutEmbeddingInput = {
    id?: string
    name: string
    description?: string | null
    createdBy: string
    createdAt?: Date | string
    updatedAt?: Date | string
    access?: BoardCreateaccessInput | string[]
    boardSections?: BoardSectionUncheckedCreateNestedManyWithoutBoardInput
  }

  export type BoardCreateOrConnectWithoutEmbeddingInput = {
    where: BoardWhereUniqueInput
    create: XOR<BoardCreateWithoutEmbeddingInput, BoardUncheckedCreateWithoutEmbeddingInput>
  }

  export type BoardUpsertWithoutEmbeddingInput = {
    update: XOR<BoardUpdateWithoutEmbeddingInput, BoardUncheckedUpdateWithoutEmbeddingInput>
    create: XOR<BoardCreateWithoutEmbeddingInput, BoardUncheckedCreateWithoutEmbeddingInput>
    where?: BoardWhereInput
  }

  export type BoardUpdateToOneWithWhereWithoutEmbeddingInput = {
    where?: BoardWhereInput
    data: XOR<BoardUpdateWithoutEmbeddingInput, BoardUncheckedUpdateWithoutEmbeddingInput>
  }

  export type BoardUpdateWithoutEmbeddingInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    access?: BoardUpdateaccessInput | string[]
    boardSections?: BoardSectionUpdateManyWithoutBoardNestedInput
  }

  export type BoardUncheckedUpdateWithoutEmbeddingInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdBy?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    access?: BoardUpdateaccessInput | string[]
    boardSections?: BoardSectionUncheckedUpdateManyWithoutBoardNestedInput
  }

  export type AIMessageCreateWithoutConversationInput = {
    id?: string
    role: string
    content: string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AIMessageUncheckedCreateWithoutConversationInput = {
    id?: string
    role: string
    content: string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AIMessageCreateOrConnectWithoutConversationInput = {
    where: AIMessageWhereUniqueInput
    create: XOR<AIMessageCreateWithoutConversationInput, AIMessageUncheckedCreateWithoutConversationInput>
  }

  export type AIMessageCreateManyConversationInputEnvelope = {
    data: AIMessageCreateManyConversationInput | AIMessageCreateManyConversationInput[]
    skipDuplicates?: boolean
  }

  export type UserCreateWithoutAiConversationsInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    accounts?: AccountCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    assignedTasks?: TaskCreateNestedManyWithoutAssignedToInput
    createdTasks?: TaskCreateNestedManyWithoutCreatedByInput
  }

  export type UserUncheckedCreateWithoutAiConversationsInput = {
    id?: string
    name?: string | null
    email: string
    emailVerified?: Date | string | null
    emailVerificationToken?: string | null
    emailTokenExpires?: Date | string | null
    image?: string | null
    password?: string | null
    cid?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    assignedTasks?: TaskUncheckedCreateNestedManyWithoutAssignedToInput
    createdTasks?: TaskUncheckedCreateNestedManyWithoutCreatedByInput
  }

  export type UserCreateOrConnectWithoutAiConversationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAiConversationsInput, UserUncheckedCreateWithoutAiConversationsInput>
  }

  export type AIMessageUpsertWithWhereUniqueWithoutConversationInput = {
    where: AIMessageWhereUniqueInput
    update: XOR<AIMessageUpdateWithoutConversationInput, AIMessageUncheckedUpdateWithoutConversationInput>
    create: XOR<AIMessageCreateWithoutConversationInput, AIMessageUncheckedCreateWithoutConversationInput>
  }

  export type AIMessageUpdateWithWhereUniqueWithoutConversationInput = {
    where: AIMessageWhereUniqueInput
    data: XOR<AIMessageUpdateWithoutConversationInput, AIMessageUncheckedUpdateWithoutConversationInput>
  }

  export type AIMessageUpdateManyWithWhereWithoutConversationInput = {
    where: AIMessageScalarWhereInput
    data: XOR<AIMessageUpdateManyMutationInput, AIMessageUncheckedUpdateManyWithoutConversationInput>
  }

  export type AIMessageScalarWhereInput = {
    AND?: AIMessageScalarWhereInput | AIMessageScalarWhereInput[]
    OR?: AIMessageScalarWhereInput[]
    NOT?: AIMessageScalarWhereInput | AIMessageScalarWhereInput[]
    id?: StringFilter<"AIMessage"> | string
    conversationId?: StringFilter<"AIMessage"> | string
    role?: StringFilter<"AIMessage"> | string
    content?: StringFilter<"AIMessage"> | string
    metadata?: JsonNullableFilter<"AIMessage">
    createdAt?: DateTimeFilter<"AIMessage"> | Date | string
  }

  export type UserUpsertWithoutAiConversationsInput = {
    update: XOR<UserUpdateWithoutAiConversationsInput, UserUncheckedUpdateWithoutAiConversationsInput>
    create: XOR<UserCreateWithoutAiConversationsInput, UserUncheckedCreateWithoutAiConversationsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAiConversationsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAiConversationsInput, UserUncheckedUpdateWithoutAiConversationsInput>
  }

  export type UserUpdateWithoutAiConversationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    accounts?: AccountUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUpdateManyWithoutAssignedToNestedInput
    createdTasks?: TaskUpdateManyWithoutCreatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutAiConversationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailVerificationToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailTokenExpires?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    image?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    cid?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    assignedTasks?: TaskUncheckedUpdateManyWithoutAssignedToNestedInput
    createdTasks?: TaskUncheckedUpdateManyWithoutCreatedByNestedInput
  }

  export type AIConversationCreateWithoutMessagesInput = {
    id?: string
    companyId: string
    title?: string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutAiConversationsInput
  }

  export type AIConversationUncheckedCreateWithoutMessagesInput = {
    id?: string
    userId: string
    companyId: string
    title?: string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AIConversationCreateOrConnectWithoutMessagesInput = {
    where: AIConversationWhereUniqueInput
    create: XOR<AIConversationCreateWithoutMessagesInput, AIConversationUncheckedCreateWithoutMessagesInput>
  }

  export type AIConversationUpsertWithoutMessagesInput = {
    update: XOR<AIConversationUpdateWithoutMessagesInput, AIConversationUncheckedUpdateWithoutMessagesInput>
    create: XOR<AIConversationCreateWithoutMessagesInput, AIConversationUncheckedCreateWithoutMessagesInput>
    where?: AIConversationWhereInput
  }

  export type AIConversationUpdateToOneWithWhereWithoutMessagesInput = {
    where?: AIConversationWhereInput
    data: XOR<AIConversationUpdateWithoutMessagesInput, AIConversationUncheckedUpdateWithoutMessagesInput>
  }

  export type AIConversationUpdateWithoutMessagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAiConversationsNestedInput
  }

  export type AIConversationUncheckedUpdateWithoutMessagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountCreateManyUserInput = {
    id?: string
    type: string
    provider: string
    providerAccountId: string
    refresh_token?: string | null
    access_token?: string | null
    expires_at?: number | null
    token_type?: string | null
    scope?: string | null
    id_token?: string | null
    session_state?: string | null
  }

  export type SessionCreateManyUserInput = {
    id?: string
    sessionToken: string
    expires: Date | string
  }

  export type TaskCreateManyAssignedToInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    createdById: string
    boardSectionId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskCreateManyCreatedByInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    assignedToId: string
    boardSectionId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AIConversationCreateManyUserInput = {
    id?: string
    companyId: string
    title?: string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AccountUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AccountUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AccountUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    refresh_token?: NullableStringFieldUpdateOperationsInput | string | null
    access_token?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableIntFieldUpdateOperationsInput | number | null
    token_type?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    id_token?: NullableStringFieldUpdateOperationsInput | string | null
    session_state?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SessionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionToken?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionToken?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionToken?: StringFieldUpdateOperationsInput | string
    expires?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUpdateWithoutAssignedToInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    boardSection?: BoardSectionUpdateOneRequiredWithoutTasksNestedInput
    history?: TaskHistoryUpdateManyWithoutTaskNestedInput
    embedding?: TaskEmbeddingUpdateOneWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutAssignedToInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    createdById?: StringFieldUpdateOperationsInput | string
    boardSectionId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    history?: TaskHistoryUncheckedUpdateManyWithoutTaskNestedInput
    embedding?: TaskEmbeddingUncheckedUpdateOneWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateManyWithoutAssignedToInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    createdById?: StringFieldUpdateOperationsInput | string
    boardSectionId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskUpdateWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignedTo?: UserUpdateOneRequiredWithoutAssignedTasksNestedInput
    boardSection?: BoardSectionUpdateOneRequiredWithoutTasksNestedInput
    history?: TaskHistoryUpdateManyWithoutTaskNestedInput
    embedding?: TaskEmbeddingUpdateOneWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    assignedToId?: StringFieldUpdateOperationsInput | string
    boardSectionId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    history?: TaskHistoryUncheckedUpdateManyWithoutTaskNestedInput
    embedding?: TaskEmbeddingUncheckedUpdateOneWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateManyWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    assignedToId?: StringFieldUpdateOperationsInput | string
    boardSectionId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AIConversationUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    messages?: AIMessageUpdateManyWithoutConversationNestedInput
  }

  export type AIConversationUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    messages?: AIMessageUncheckedUpdateManyWithoutConversationNestedInput
  }

  export type AIConversationUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    context?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskHistoryCreateManyTaskInput = {
    id?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    description?: string | null
  }

  export type TaskHistoryUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TaskHistoryUncheckedUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TaskHistoryUncheckedUpdateManyWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type BoardSectionCreateManyBoardInput = {
    id?: string
    name: string
    position?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BoardSectionUpdateWithoutBoardInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tasks?: TaskUpdateManyWithoutBoardSectionNestedInput
  }

  export type BoardSectionUncheckedUpdateWithoutBoardInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tasks?: TaskUncheckedUpdateManyWithoutBoardSectionNestedInput
  }

  export type BoardSectionUncheckedUpdateManyWithoutBoardInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TaskCreateManyBoardSectionInput = {
    id?: string
    title: string
    description: string
    priority?: $Enums.TaskPriority
    status?: $Enums.TaskStatusNew
    dueDate: Date | string
    position?: number
    assignedToId: string
    createdById: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TaskUpdateWithoutBoardSectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignedTo?: UserUpdateOneRequiredWithoutAssignedTasksNestedInput
    createdBy?: UserUpdateOneRequiredWithoutCreatedTasksNestedInput
    history?: TaskHistoryUpdateManyWithoutTaskNestedInput
    embedding?: TaskEmbeddingUpdateOneWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateWithoutBoardSectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    assignedToId?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    history?: TaskHistoryUncheckedUpdateManyWithoutTaskNestedInput
    embedding?: TaskEmbeddingUncheckedUpdateOneWithoutTaskNestedInput
  }

  export type TaskUncheckedUpdateManyWithoutBoardSectionInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    priority?: EnumTaskPriorityFieldUpdateOperationsInput | $Enums.TaskPriority
    status?: EnumTaskStatusNewFieldUpdateOperationsInput | $Enums.TaskStatusNew
    dueDate?: DateTimeFieldUpdateOperationsInput | Date | string
    position?: IntFieldUpdateOperationsInput | number
    assignedToId?: StringFieldUpdateOperationsInput | string
    createdById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AIMessageCreateManyConversationInput = {
    id?: string
    role: string
    content: string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type AIMessageUpdateWithoutConversationInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AIMessageUncheckedUpdateWithoutConversationInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AIMessageUncheckedUpdateManyWithoutConversationInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}