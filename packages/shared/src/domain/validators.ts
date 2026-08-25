import { z } from "zod";

export const listInsertSchema = z.object({
  name: z.string().trim().min(1, "清單名稱不能為空").max(100),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "顏色需為 #RRGGBB 格式")
    .optional(),
});

export const listUpdateSchema = listInsertSchema.partial();

export const todoInsertSchema = z.object({
  list_id: z.string().uuid(),
  title: z.string().trim().min(1, "標題不能為空").max(500),
  notes: z.string().max(5000).optional(),
  due_date: z.string().date().optional().nullable(),
});

export const todoUpdateSchema = z.object({
  list_id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(500).optional(),
  notes: z.string().max(5000).optional().nullable(),
  due_date: z.string().date().optional().nullable(),
  is_completed: z.boolean().optional(),
  position: z.number().int().optional(),
});

export type ListInsertInput = z.infer<typeof listInsertSchema>;
export type ListUpdateInput = z.infer<typeof listUpdateSchema>;
export type TodoInsertInput = z.infer<typeof todoInsertSchema>;
export type TodoUpdateInput = z.infer<typeof todoUpdateSchema>;
