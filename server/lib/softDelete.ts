import type { Query, Schema } from 'mongoose';

declare module 'mongoose' {
  interface QueryOptions {
    /** true なら論理削除済みのドキュメントも対象にする */
    withDeleted?: boolean;
  }
}

const QUERY_OPS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'countDocuments',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
] as const;

/**
 * 論理削除プラグイン。`deletedAt` を追加し、find / count / update / delete の
 * クエリに自動で `deletedAt: null` を足す (未設定の既存データも対象になる)。
 * 削除済みも扱いたいクエリは `.setOptions({ withDeleted: true })` を付ける。
 * ※ aggregate と bulkWrite は対象外 (自動では除外されない)。
 */
export function softDeletePlugin(schema: Schema) {
  schema.add({ deletedAt: { type: Date, default: null, index: true } });
  for (const op of QUERY_OPS) {
    schema.pre(op, { query: true, document: false }, function (this: Query<unknown, unknown>) {
      if (this.getOptions().withDeleted) return;
      this.where({ deletedAt: null });
    });
  }
}
