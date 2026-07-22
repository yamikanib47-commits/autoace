import app from "./index";

export default {
  async fetch(request: Request, env: Parameters<typeof app.fetch>[1], ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
