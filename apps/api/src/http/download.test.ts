import { describe, expect, test } from "bun:test";

import { contentDisposition } from "./download";

describe("download responses", () => {
  test("builds safe content disposition headers", () => {
    const header = contentDisposition('résumé "draft"\n/report.webp');

    expect(header).toBe(
      'attachment; filename="r_sum_ _draft___report.webp"; filename*=UTF-8\'\'r%C3%A9sum%C3%A9%20%22draft%22__report.webp',
    );
  });
});
