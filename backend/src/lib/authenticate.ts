import { RouteHandlerMethod } from "fastify";

export const authenticate: RouteHandlerMethod = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ message: "Unauthorized: Invalid token" });
  }
};
