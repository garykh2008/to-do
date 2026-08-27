import { z } from "zod";

const recurrenceRuleSchema = z.object({
  freq: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().min(1).max(365),
  byDay: z.array(z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"])).optional(),
});

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
  parent_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1, "標題不能為空").max(500),
  notes: z.string().max(5000).optional(),
  due_date: z.string().date().optional().nullable(),
  priority: z.number().int().min(1).max(4).optional(),
  labels: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  recurrence_rule: recurrenceRuleSchema.optional().nullable(),
});

export const todoUpdateSchema = z.object({
  list_id: z.string().uuid().optional(),
  parent_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(500).optional(),
  notes: z.string().max(5000).optional().nullable(),
  due_date: z.string().date().optional().nullable(),
  priority: z.number().int().min(1).max(4).optional(),
  labels: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  recurrence_rule: recurrenceRuleSchema.optional().nullable(),
  is_completed: z.boolean().optional(),
  position: z.number().int().optional(),
});

export type ListInsertInput = z.infer<typeof listInsertSchema>;
export type ListUpdateInput = z.infer<typeof listUpdateSchema>;
export type TodoInsertInput = z.infer<typeof todoInsertSchema>;
export type TodoUpdateInput = z.infer<typeof todoUpdateSchema>;
