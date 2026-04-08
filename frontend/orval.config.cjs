module.exports = {
  admin: {
    input: {
      target: "./packages/api/openapi/admin.json",
    },
    output: {
      target: "./packages/api/src/generated/admin.ts",
      schemas: "./packages/types/src/generated/model",
      client: "axios-functions",
      clean: true,
      override: {
        mutator: {
          path: "./packages/api/src/runtime/openapi.ts",
          name: "customInstance",
        },
      },
    },
  },
};
