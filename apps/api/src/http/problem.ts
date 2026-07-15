import type { Context } from "hono";

type ProblemOptions = {
  type: string;
  title: string;
  status: number;
  detail: string;
};

export function problem(c: Context, options: ProblemOptions) {
  const requestId = c.get("requestId");

  return c.json(
    {
      type: `https://docs.reubah.com/errors/${options.type}`,
      title: options.title,
      status: options.status,
      detail: options.detail,
      request_id: requestId,
    },
    options.status as never,
    {
      "Content-Type": "application/problem+json",
    },
  );
}
